use serde::{Deserialize, Serialize};
use std::fs;
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

#[command]
pub fn open_file(path: String) -> Result<FileInfo, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
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
) -> Result<SaveResult, String> {
    let original_path = Path::new(&path);
    if !original_path.exists() {
        return Err("File does not exist".to_string());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let backup_dir = get_backup_dir(&app_data_dir);
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
    fs::write(&temp_path, &content).map_err(|e| format!("Failed to write temp file: {}", e))?;

    fs::rename(&temp_path, original_path)
        .map_err(|e| format!("Failed to replace original file: {}", e))?;

    Ok(SaveResult {
        success: true,
        backup_path: Some(backup_path.to_string_lossy().to_string()),
        error: None,
    })
}

#[command]
pub fn list_backups(app: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let backup_dir = get_backup_dir(&app_data_dir);

    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut backups: Vec<BackupInfo> = Vec::new();

    let entries =
        fs::read_dir(&backup_dir).map_err(|e| format!("Failed to read backup dir: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.ends_with(".bak") {
                let timestamp = name
                    .trim_end_matches(".bak")
                    .split('_')
                    .rev()
                    .take(2)
                    .collect::<Vec<_>>()
                    .join("_");

                backups.push(BackupInfo {
                    path: path.to_string_lossy().to_string(),
                    timestamp,
                    original_path: String::new(),
                });
            }
        }
    }

    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(backups)
}

#[command]
pub fn restore_backup(backup_path: String, target_path: String) -> Result<SaveResult, String> {
    let backup = Path::new(&backup_path);
    let target = Path::new(&target_path);

    if !backup.exists() {
        return Err("Backup file does not exist".to_string());
    }

    let content =
        fs::read_to_string(backup).map_err(|e| format!("Failed to read backup: {}", e))?;

    fs::write(target, &content).map_err(|e| format!("Failed to restore backup: {}", e))?;

    Ok(SaveResult {
        success: true,
        backup_path: None,
        error: None,
    })
}

#[command]
pub fn validate_json(content: String) -> Result<bool, String> {
    serde_json::from_str::<serde_json::Value>(&content)
        .map(|_| true)
        .map_err(|e| format!("Invalid JSON: {}", e))
}
