use serde::{Deserialize, Serialize};
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use tauri::command;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub path: String,
    pub content: String,
    pub format: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaveResult {
    pub success: bool,
    pub backup_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupInfo {
    pub path: String,
    pub timestamp: String,
    pub original_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BackupRetentionMode {
    Count,
    Age,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupRetentionSettings {
    pub mode: BackupRetentionMode,
    pub value: u32,
}

fn validate_file_path(path: &str) -> Result<PathBuf, String> {
    let canonical = std::path::Path::new(path)
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;

    let canonical_str = canonical.to_string_lossy();

    if canonical_str.contains("/dev/")
        || canonical_str.contains("/proc/")
        || canonical_str.contains("/sys/")
    {
        return Err("Access to system paths is not allowed".to_string());
    }

    Ok(canonical)
}

fn detect_format(path: &str) -> String {
    let lower = path.to_lowercase();
    if lower.ends_with(".jsonc") {
        "jsonc".to_string()
    } else if lower.ends_with(".json") {
        "json".to_string()
    } else if lower.ends_with(".yaml") || lower.ends_with(".yml") {
        "yaml".to_string()
    } else if lower.ends_with(".toml") {
        "toml".to_string()
    } else {
        "json".to_string()
    }
}

fn get_backup_dir(app_data_dir: &Path) -> PathBuf {
    let backup_dir = app_data_dir.join("backups");
    let _ = fs::create_dir_all(&backup_dir);
    backup_dir
}

fn encode_path_for_backup_dir(path: &str) -> String {
    path.as_bytes()
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .collect()
}

fn get_file_backup_dir(app_data_dir: &Path, path: &str) -> PathBuf {
    get_backup_dir(app_data_dir).join(encode_path_for_backup_dir(path))
}

fn extract_backup_timestamp(name: &str) -> Option<String> {
    if !name.ends_with(".bak") {
        return None;
    }

    let stem = name.trim_end_matches(".bak");
    let mut parts = stem.rsplitn(3, '_');
    let time = parts.next()?;
    let date = parts.next()?;

    if date.len() == 8 && time.len() == 6 {
        Some(format!("{}_{}", date, time))
    } else {
        None
    }
}

fn parse_backup_timestamp(timestamp: &str) -> Option<chrono::NaiveDateTime> {
    chrono::NaiveDateTime::parse_from_str(timestamp, "%Y%m%d_%H%M%S").ok()
}

fn backup_entries(backup_dir: &Path) -> Result<Vec<(PathBuf, String)>, String> {
    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut entries = Vec::new();
    let dir_entries =
        fs::read_dir(backup_dir).map_err(|e| format!("Failed to read backup dir: {}", e))?;

    for entry in dir_entries.flatten() {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        let Some(timestamp) = extract_backup_timestamp(name) else {
            continue;
        };
        entries.push((path, timestamp));
    }

    entries.sort_by(|left, right| right.1.cmp(&left.1));
    Ok(entries)
}

fn prune_backups(backup_dir: &Path, retention: &BackupRetentionSettings) -> Result<(), String> {
    let backups = backup_entries(backup_dir)?;

    match retention.mode {
        BackupRetentionMode::Count => {
            let keep_count = retention.value as usize;
            for (path, _) in backups.into_iter().skip(keep_count) {
                fs::remove_file(&path)
                    .map_err(|e| format!("Failed to prune backup {}: {}", path.display(), e))?;
            }
        }
        BackupRetentionMode::Age => {
            let cutoff = chrono::Local::now().naive_local()
                - chrono::Duration::days(i64::from(retention.value));

            for (path, timestamp) in backups {
                let Some(parsed) = parse_backup_timestamp(&timestamp) else {
                    continue;
                };

                if parsed < cutoff {
                    fs::remove_file(&path).map_err(|e| {
                        format!("Failed to prune expired backup {}: {}", path.display(), e)
                    })?;
                }
            }
        }
    }

    Ok(())
}

fn save_file_with_backup(
    app_data_dir: &Path,
    path: &str,
    content: &str,
    backup_retention: Option<BackupRetentionSettings>,
) -> Result<SaveResult, String> {
    let original_path = Path::new(path);
    if !original_path.exists() {
        return Err("File does not exist".to_string());
    }

    let backup_dir = get_file_backup_dir(app_data_dir, path);
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();

    let file_name = original_path
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();

    let backup_file_name = format!("{}_{}.bak", file_name, timestamp);
    let backup_path = backup_dir.join(&backup_file_name);

    let original_content = fs::read_to_string(original_path)
        .map_err(|e| format!("Failed to read original file: {}", e))?;

    fs::write(&backup_path, &original_content)
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    let temp_path = original_path.with_extension("tmp");
    fs::write(&temp_path, content).map_err(|e| format!("Failed to write temp file: {}", e))?;

    fs::rename(&temp_path, original_path)
        .map_err(|e| format!("Failed to replace original file: {}", e))?;

    if let Some(retention) = backup_retention {
        prune_backups(&backup_dir, &retention)?;
    }

    Ok(SaveResult {
        success: true,
        backup_path: Some(backup_path.to_string_lossy().to_string()),
        error: None,
    })
}

fn list_backups_in_dir(backup_dir: &Path, original_path: &str) -> Result<Vec<BackupInfo>, String> {
    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut backups: Vec<BackupInfo> = Vec::new();

    for (path, timestamp) in backup_entries(backup_dir)? {
        backups.push(BackupInfo {
            path: path.to_string_lossy().to_string(),
            timestamp,
            original_path: original_path.to_string(),
        });
    }

    Ok(backups)
}

#[command]
pub fn open_file(path: String) -> Result<FileInfo, String> {
    let canonical = validate_file_path(&path)?;
    let content =
        fs::read_to_string(&canonical).map_err(|e| format!("Failed to read file: {}", e))?;
    let format = detect_format(&path);
    Ok(FileInfo {
        path,
        content,
        format,
    })
}

#[command]
pub fn save_file(
    app: tauri::AppHandle,
    path: String,
    content: String,
    backup_retention: Option<BackupRetentionSettings>,
) -> Result<SaveResult, String> {
    let _ = validate_file_path(&path)?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    save_file_with_backup(&app_data_dir, &path, &content, backup_retention)
}

#[command]
pub fn list_backups(app: tauri::AppHandle, target_path: String) -> Result<Vec<BackupInfo>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let backup_dir = get_file_backup_dir(&app_data_dir, &target_path);
    list_backups_in_dir(&backup_dir, &target_path)
}

#[command]
pub fn restore_backup(backup_path: String, target_path: String) -> Result<SaveResult, String> {
    let backup = validate_file_path(&backup_path)?;
    let target = validate_file_path(&target_path)?;

    if !backup.exists() {
        return Err("Backup file does not exist".to_string());
    }

    let content =
        fs::read_to_string(&backup).map_err(|e| format!("Failed to read backup: {}", e))?;

    fs::write(&target, &content).map_err(|e| format!("Failed to restore backup: {}", e))?;

    Ok(SaveResult {
        success: true,
        backup_path: None,
        error: None,
    })
}

#[command]
pub fn delete_backup(backup_path: String) -> Result<bool, String> {
    let canonical = validate_file_path(&backup_path)?;
    match fs::remove_file(&canonical) {
        Ok(_) => Ok(true),
        Err(error) if error.kind() == ErrorKind::NotFound => {
            Err("Backup file does not exist".to_string())
        }
        Err(error) => Err(format!("Failed to delete backup: {}", error)),
    }
}

#[command]
pub fn validate_json(content: String) -> Result<bool, String> {
    serde_json::from_str::<serde_json::Value>(&content)
        .map(|_| true)
        .map_err(|e| format!("Invalid JSON: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_path(label: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("config-studio-tests-{}-{}", label, unique))
    }

    #[test]
    fn detect_format_matches_supported_extensions() {
        assert_eq!(detect_format("/tmp/file.JSON"), "json");
        assert_eq!(detect_format("/tmp/file.jsonc"), "jsonc");
        assert_eq!(detect_format("/tmp/file.yml"), "yaml");
        assert_eq!(detect_format("/tmp/file.toml"), "toml");
        assert_eq!(detect_format("/tmp/file.conf"), "json");
    }

    #[test]
    fn open_file_reads_content_and_detects_format() {
        let dir = temp_path("open-file");
        fs::create_dir_all(&dir).expect("create test dir");
        let file_path = dir.join("config.jsonc");
        fs::write(&file_path, "{\n  \"name\": \"OpenCode\"\n}").expect("write config file");

        let result = open_file(file_path.to_string_lossy().to_string()).expect("open file");

        assert_eq!(result.format, "jsonc");
        assert!(result.content.contains("OpenCode"));

        fs::remove_dir_all(&dir).expect("remove test dir");
    }

    #[test]
    fn save_file_with_backup_replaces_original_and_keeps_backup() {
        let app_data_dir = temp_path("save-app-data");
        let working_dir = temp_path("save-workdir");
        fs::create_dir_all(&app_data_dir).expect("create app data dir");
        fs::create_dir_all(&working_dir).expect("create working dir");

        let file_path = working_dir.join("settings.json");
        fs::write(&file_path, "{\"name\":\"before\"}").expect("write original file");

        let path_string = file_path.to_string_lossy().to_string();
        let result =
            save_file_with_backup(&app_data_dir, &path_string, "{\"name\":\"after\"}", None)
                .expect("save file with backup");

        let backup_path = PathBuf::from(result.backup_path.expect("backup path present"));

        assert!(result.success);
        assert_eq!(
            fs::read_to_string(&file_path).expect("read updated file"),
            "{\"name\":\"after\"}"
        );
        assert_eq!(
            fs::read_to_string(&backup_path).expect("read backup"),
            "{\"name\":\"before\"}"
        );

        fs::remove_dir_all(&app_data_dir).expect("remove app data dir");
        fs::remove_dir_all(&working_dir).expect("remove working dir");
    }

    #[test]
    fn list_backups_in_dir_returns_newest_first() {
        let backup_dir = temp_path("list-backups");
        fs::create_dir_all(&backup_dir).expect("create backup dir");
        fs::write(backup_dir.join("settings.json_20240101_010101.bak"), "one")
            .expect("write old backup");
        fs::write(backup_dir.join("settings.json_20240201_010101.bak"), "two")
            .expect("write new backup");
        fs::write(backup_dir.join("ignore.txt"), "three").expect("write ignored file");

        let backups = list_backups_in_dir(&backup_dir, "/tmp/settings.json").expect("list backups");

        assert_eq!(backups.len(), 2);
        assert_eq!(backups[0].timestamp, "20240201_010101");
        assert_eq!(backups[1].timestamp, "20240101_010101");
        assert!(backups
            .iter()
            .all(|backup| backup.original_path == "/tmp/settings.json"));

        fs::remove_dir_all(&backup_dir).expect("remove backup dir");
    }

    #[test]
    fn save_file_with_backup_scopes_backups_by_original_path() {
        let app_data_dir = temp_path("scoped-save-app-data");
        let first_dir = temp_path("scoped-save-first");
        let second_dir = temp_path("scoped-save-second");
        fs::create_dir_all(&app_data_dir).expect("create app data dir");
        fs::create_dir_all(&first_dir).expect("create first dir");
        fs::create_dir_all(&second_dir).expect("create second dir");

        let first_file = first_dir.join("settings.json");
        let second_file = second_dir.join("settings.json");
        fs::write(&first_file, "{\"name\":\"first-before\"}").expect("write first file");
        fs::write(&second_file, "{\"name\":\"second-before\"}").expect("write second file");

        let first_path = first_file.to_string_lossy().to_string();
        let second_path = second_file.to_string_lossy().to_string();

        save_file_with_backup(
            &app_data_dir,
            &first_path,
            "{\"name\":\"first-after\"}",
            None,
        )
        .expect("save first file");
        save_file_with_backup(
            &app_data_dir,
            &second_path,
            "{\"name\":\"second-after\"}",
            None,
        )
        .expect("save second file");

        let first_backups = list_backups_in_dir(
            &get_file_backup_dir(&app_data_dir, &first_path),
            &first_path,
        )
        .expect("list first backups");
        let second_backups = list_backups_in_dir(
            &get_file_backup_dir(&app_data_dir, &second_path),
            &second_path,
        )
        .expect("list second backups");

        assert_eq!(first_backups.len(), 1);
        assert_eq!(second_backups.len(), 1);
        assert_eq!(first_backups[0].original_path, first_path);
        assert_eq!(second_backups[0].original_path, second_path);
        assert_ne!(first_backups[0].path, second_backups[0].path);

        fs::remove_dir_all(&app_data_dir).expect("remove app data dir");
        fs::remove_dir_all(&first_dir).expect("remove first dir");
        fs::remove_dir_all(&second_dir).expect("remove second dir");
    }

    #[test]
    fn prune_backups_keeps_only_the_requested_count() {
        let backup_dir = temp_path("prune-count");
        fs::create_dir_all(&backup_dir).expect("create backup dir");

        fs::write(backup_dir.join("settings.json_20240101_010101.bak"), "one")
            .expect("write oldest backup");
        fs::write(backup_dir.join("settings.json_20240201_010101.bak"), "two")
            .expect("write middle backup");
        fs::write(
            backup_dir.join("settings.json_20240301_010101.bak"),
            "three",
        )
        .expect("write newest backup");

        prune_backups(
            &backup_dir,
            &BackupRetentionSettings {
                mode: BackupRetentionMode::Count,
                value: 2,
            },
        )
        .expect("prune backups");

        let backups =
            list_backups_in_dir(&backup_dir, "/tmp/settings.json").expect("list pruned backups");
        assert_eq!(backups.len(), 2);
        assert_eq!(backups[0].timestamp, "20240301_010101");
        assert_eq!(backups[1].timestamp, "20240201_010101");

        fs::remove_dir_all(&backup_dir).expect("remove backup dir");
    }

    #[test]
    fn prune_backups_removes_entries_older_than_the_requested_age() {
        let backup_dir = temp_path("prune-age");
        fs::create_dir_all(&backup_dir).expect("create backup dir");

        let now = chrono::Local::now();
        let expired = now - chrono::Duration::days(45);
        let fresh = now - chrono::Duration::days(5);

        fs::write(
            backup_dir.join(format!(
                "settings.json_{}.bak",
                expired.format("%Y%m%d_%H%M%S")
            )),
            "old",
        )
        .expect("write expired backup");
        fs::write(
            backup_dir.join(format!(
                "settings.json_{}.bak",
                fresh.format("%Y%m%d_%H%M%S")
            )),
            "new",
        )
        .expect("write fresh backup");

        prune_backups(
            &backup_dir,
            &BackupRetentionSettings {
                mode: BackupRetentionMode::Age,
                value: 30,
            },
        )
        .expect("prune backups by age");

        let backups = list_backups_in_dir(&backup_dir, "/tmp/settings.json").expect("list backups");
        assert_eq!(backups.len(), 1);
        assert_eq!(
            backups[0].timestamp,
            fresh.format("%Y%m%d_%H%M%S").to_string()
        );

        fs::remove_dir_all(&backup_dir).expect("remove backup dir");
    }

    #[test]
    fn restore_backup_overwrites_target_file() {
        let dir = temp_path("restore-backup");
        fs::create_dir_all(&dir).expect("create restore dir");

        let backup_path = dir.join("settings.json_20240101_010101.bak");
        let target_path = dir.join("settings.json");
        fs::write(&backup_path, "{\"name\":\"from-backup\"}").expect("write backup file");
        fs::write(&target_path, "{\"name\":\"current\"}").expect("write target file");

        let result = restore_backup(
            backup_path.to_string_lossy().to_string(),
            target_path.to_string_lossy().to_string(),
        )
        .expect("restore backup");

        assert!(result.success);
        assert_eq!(
            fs::read_to_string(&target_path).expect("read restored target"),
            "{\"name\":\"from-backup\"}"
        );

        fs::remove_dir_all(&dir).expect("remove restore dir");
    }

    #[test]
    fn delete_backup_removes_backup_file() {
        let dir = temp_path("delete-backup");
        fs::create_dir_all(&dir).expect("create delete dir");

        let backup_path = dir.join("settings.json_20240101_010101.bak");
        fs::write(&backup_path, "{\"name\":\"from-backup\"}").expect("write backup file");

        let deleted =
            delete_backup(backup_path.to_string_lossy().to_string()).expect("delete backup");

        assert!(deleted);
        assert!(!backup_path.exists());

        fs::remove_dir_all(&dir).expect("remove delete dir");
    }

    #[test]
    fn validate_json_accepts_valid_input_and_rejects_invalid_input() {
        assert!(validate_json("{\"name\":\"OpenCode\"}".to_string()).expect("valid json"));
        assert!(validate_json("{\"name\":".to_string()).is_err());
    }

    #[test]
    fn detect_format_handles_yaml_extension() {
        assert_eq!(detect_format("/tmp/file.yaml"), "yaml");
    }

    #[test]
    fn detect_format_is_case_insensitive() {
        assert_eq!(detect_format("/tmp/file.JSON"), "json");
        assert_eq!(detect_format("/tmp/file.YML"), "yaml");
        assert_eq!(detect_format("/tmp/file.TOML"), "toml");
    }

    #[test]
    fn detect_format_defaults_to_json_for_unknown_extensions() {
        assert_eq!(detect_format("/tmp/file.conf"), "json");
        assert_eq!(detect_format("/tmp/file"), "json");
    }

    #[test]
    fn extract_backup_timestamp_parses_valid_name() {
        let result = extract_backup_timestamp("settings.json_20240101_010101.bak");
        assert_eq!(result, Some("20240101_010101".to_string()));
    }

    #[test]
    fn extract_backup_timestamp_rejects_non_bak() {
        assert_eq!(
            extract_backup_timestamp("settings.json_20240101_010101.txt"),
            None
        );
    }

    #[test]
    fn extract_backup_timestamp_rejects_malformed_date() {
        assert_eq!(
            extract_backup_timestamp("settings.json_2024_0101.bak"),
            None
        );
    }

    #[test]
    fn parse_backup_timestamp_round_trips() {
        let ts = "20240615_143022";
        let parsed = parse_backup_timestamp(ts);
        assert!(parsed.is_some());
        assert_eq!(parsed.unwrap().format("%Y%m%d_%H%M%S").to_string(), ts);
    }

    #[test]
    fn parse_backup_timestamp_rejects_invalid() {
        assert!(parse_backup_timestamp("not-a-timestamp").is_none());
    }

    #[test]
    fn encode_path_for_backup_dir_encodes_simple_path() {
        let encoded = encode_path_for_backup_dir("/tmp/config.json");
        assert!(!encoded.is_empty());
        assert!(!encoded.contains('/'));
    }

    #[test]
    fn backup_entries_returns_empty_for_nonexistent_dir() {
        let dir = temp_path("nonexistent-backup-entries");
        let result = backup_entries(&dir).expect("backup entries");
        assert!(result.is_empty());
    }

    #[test]
    fn validate_json_accepts_empty_object() {
        assert!(validate_json("{}".to_string()).expect("empty object"));
    }

    #[test]
    fn validate_json_accepts_array() {
        assert!(validate_json("[1, 2, 3]".to_string()).expect("array"));
    }

    #[test]
    fn validate_json_rejects_empty_string() {
        assert!(validate_json("".to_string()).is_err());
    }

    #[test]
    fn validate_json_accepts_null() {
        assert!(validate_json("null".to_string()).expect("null"));
    }

    #[test]
    fn prune_backups_count_zero_removes_all() {
        let backup_dir = temp_path("prune-zero");
        fs::create_dir_all(&backup_dir).expect("create dir");
        fs::write(backup_dir.join("f_20240101_010101.bak"), "a").expect("write");
        fs::write(backup_dir.join("f_20240201_010101.bak"), "b").expect("write");

        prune_backups(
            &backup_dir,
            &BackupRetentionSettings {
                mode: BackupRetentionMode::Count,
                value: 0,
            },
        )
        .expect("prune");

        let remaining = backup_entries(&backup_dir).expect("entries");
        assert!(remaining.is_empty());

        fs::remove_dir_all(&backup_dir).expect("cleanup");
    }

    #[test]
    fn list_backups_in_dir_returns_empty_for_empty_dir() {
        let dir = temp_path("empty-backup-dir");
        fs::create_dir_all(&dir).expect("create dir");

        let result = list_backups_in_dir(&dir, "/tmp/f.json").expect("list");
        assert!(result.is_empty());

        fs::remove_dir_all(&dir).expect("cleanup");
    }

    #[test]
    fn delete_backup_returns_error_for_missing_file() {
        let result = delete_backup("/tmp/nonexistent_backup_file_12345.bak".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn save_file_with_backup_returns_error_for_nonexistent_file() {
        let app_data_dir = temp_path("save-error-app");
        fs::create_dir_all(&app_data_dir).expect("create dir");

        let result = save_file_with_backup(
            &app_data_dir,
            "/tmp/nonexistent_config_file_xyz.json",
            "content",
            None,
        );
        assert!(result.is_err());

        fs::remove_dir_all(&app_data_dir).expect("cleanup");
    }

    #[test]
    fn restore_backup_returns_error_for_missing_backup() {
        let dir = temp_path("restore-error");
        fs::create_dir_all(&dir).expect("create dir");
        let target = dir.join("target.json");
        fs::write(&target, "current").expect("write target");

        let result = restore_backup(
            dir.join("nonexistent_20240101_010101.bak")
                .to_string_lossy()
                .to_string(),
            target.to_string_lossy().to_string(),
        );
        assert!(result.is_err());

        fs::remove_dir_all(&dir).expect("cleanup");
    }
}
