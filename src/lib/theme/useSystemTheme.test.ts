import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { useSystemTheme } from "./useSystemTheme";

type MediaQueryListener = (event: MediaQueryListEvent) => void;

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<MediaQueryListener>();
  const mql = {
    matches: initial,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  } as unknown as MediaQueryList & {
    setMatches: (value: boolean) => void;
  };

  (mql as unknown as { setMatches: (value: boolean) => void }).setMatches = (value: boolean) => {
    (mql as unknown as { matches: boolean }).matches = value;
    listeners.forEach((listener) =>
      listener({ matches: value } as MediaQueryListEvent)
    );
  };

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => mql),
  });

  return mql as MediaQueryList & { setMatches: (value: boolean) => void };
}

describe("useSystemTheme", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "";
    document.documentElement.classList.remove("jse-theme-dark");
    useAppStore.setState({ preferences: createDefaultPreferences() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 'light' when the media query does not match", () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useSystemTheme());
    expect(result.current).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.classList.contains("jse-theme-dark")).toBe(false);
  });

  it("returns 'dark' when the media query matches", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useSystemTheme());
    expect(result.current).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("jse-theme-dark")).toBe(true);
  });

  it("updates when the system preference changes", () => {
    const mql = stubMatchMedia(false);
    const { result } = renderHook(() => useSystemTheme());
    expect(result.current).toBe("light");

    act(() => {
      mql.setMatches(true);
    });

    expect(result.current).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("jse-theme-dark")).toBe(true);
  });

  it("prefers the pinned theme over the system theme", () => {
    stubMatchMedia(false);
    useAppStore.getState().setThemePreference("dark");

    const { result } = renderHook(() => useSystemTheme());

    expect(result.current).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("jse-theme-dark")).toBe(true);
  });
});
