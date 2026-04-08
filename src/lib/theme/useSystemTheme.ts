import { useEffect, useSyncExternalStore } from "react";
import { resolveThemeMode } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import type { ThemeMode } from "@/types";

function getMediaQueryList(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia("(prefers-color-scheme: dark)");
}

function subscribe(onChange: () => void): () => void {
  const mql = getMediaQueryList();
  if (!mql) {
    return () => {};
  }
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): ThemeMode {
  return getMediaQueryList()?.matches ? "dark" : "light";
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function useSystemTheme(): ThemeMode {
  const themePreference = useAppStore((state) => state.preferences.themePreference);
  const systemTheme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const theme = resolveThemeMode(themePreference, systemTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("jse-theme-dark", theme === "dark");
  }, [theme]);

  return theme;
}
