import { useEffect, useState, useCallback } from 'react';
import { THEME_PRESETS, type ColorThemeId } from '../themePresets';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';
export type FontScale = 'compact' | 'standard' | 'large';

const STORAGE_THEME_KEY = 'choychat_theme_mode';
const STORAGE_COLOR_THEME_KEY = 'choychat_color_theme_v1';
const STORAGE_FONT_KEY = 'choychat_font_scale';
const STORAGE_MOTION_KEY = 'choychat_reduced_motion';

function readStoredThemeMode(): ThemeMode {
  try {
    const val = localStorage.getItem(STORAGE_THEME_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') return val;
  } catch {
    // ignore storage errors
  }
  return 'dark';
}

function readStoredColorTheme(): ColorThemeId {
  try {
    const val = localStorage.getItem(STORAGE_COLOR_THEME_KEY);
    if (val === 'forest' || val === 'ocean' || val === 'sunset' || val === 'royal') return val;
  } catch {
    // ignore storage errors
  }
  return 'forest';
}

function readStoredFontScale(): FontScale {
  try {
    const val = localStorage.getItem(STORAGE_FONT_KEY);
    if (val === 'compact' || val === 'standard' || val === 'large') return val;
  } catch {
    // ignore
  }
  return 'standard';
}

function readStoredReducedMotion(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_MOTION_KEY);
    if (val === 'true') return true;
    if (val === 'false') return false;
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function useThemePreferences() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(readStoredThemeMode);
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(readStoredColorTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [fontScale, setFontScaleState] = useState<FontScale>(readStoredFontScale);
  const [reducedMotion, setReducedMotionState] = useState<boolean>(readStoredReducedMotion);

  const resolvedTheme: ResolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (ev: MediaQueryListEvent) => {
      setSystemTheme(ev.matches ? 'dark' : 'light');
    };
    setSystemTheme(mql.matches ? 'dark' : 'light');
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === 'dark';
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    root.setAttribute('data-color-theme', colorTheme);

    const preset = THEME_PRESETS[colorTheme];
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? preset.metaDark : preset.metaLight);
    }
  }, [resolvedTheme, colorTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font-scale', fontScale);
  }, [fontScale]);

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-reduced-motion');
    }
  }, [reducedMotion]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const setColorTheme = useCallback((id: ColorThemeId) => {
    setColorThemeState(id);
    try {
      localStorage.setItem(STORAGE_COLOR_THEME_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const toggleLightDark = useCallback(() => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  }, [resolvedTheme, setThemeMode]);

  const setFontScale = useCallback((scale: FontScale) => {
    setFontScaleState(scale);
    try {
      localStorage.setItem(STORAGE_FONT_KEY, scale);
    } catch {
      // ignore
    }
  }, []);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setReducedMotionState(enabled);
    try {
      localStorage.setItem(STORAGE_MOTION_KEY, String(enabled));
    } catch {
      // ignore
    }
  }, []);

  const resetAppearance = useCallback(() => {
    setThemeMode('dark');
    setColorTheme('forest');
    setFontScale('standard');
    setReducedMotion(false);
  }, [setThemeMode, setColorTheme, setFontScale, setReducedMotion]);

  return {
    themeMode,
    resolvedTheme,
    colorTheme,
    fontScale,
    reducedMotion,
    setThemeMode,
    setColorTheme,
    toggleLightDark,
    setFontScale,
    setReducedMotion,
    resetAppearance,
  };
}
