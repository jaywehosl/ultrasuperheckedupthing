import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';

const STORAGE_DARK = 'dark-mode';
const STORAGE_ULTRA = 'isUltraDarkThemeEnabled';

function readBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === 'true';
}

function applyDom(isDark: boolean, isUltra: boolean) {
  document.body.setAttribute('class', isDark ? 'dark' : 'light');
  if (isUltra) {
    document.documentElement.setAttribute('data-theme', 'ultra-dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const msg = document.getElementById('message');
  if (msg) msg.className = isDark ? 'dark' : 'light';
}

// module load so the document is in the right theme before React mounts.
const initialDark = readBool(STORAGE_DARK, true);
const initialUltra = readBool(STORAGE_ULTRA, false);
applyDom(initialDark, initialUltra);

const DARK_TOKENS = {
  colorPrimary: '#00f0ff', // Glowing Cyan
  colorSuccess: '#39ff14', // Neon Green
  colorWarning: '#ffae00', // Neon Warning Orange
  colorError: '#ff3b30',   // Neon Red
  colorBgBase: '#08090c',
  colorBgLayout: '#040507',
  colorBgContainer: '#0d1117',
  colorBgElevated: '#161b22',
  colorBorder: '#1f2937',
  colorTextBase: '#f3f4f6',
  borderRadius: 6,
  fontFamily: 'Outfit, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyCode: '"Fira Code", "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
};
const ULTRA_DARK_TOKENS = {
  colorPrimary: '#00f0ff', // Glowing Cyan
  colorSuccess: '#39ff14',
  colorWarning: '#ffae00',
  colorError: '#ff3b30',
  colorBgBase: '#000000',
  colorBgLayout: '#000000',
  colorBgContainer: '#070709',
  colorBgElevated: '#0f0f12',
  colorBorder: '#141416',
  colorTextBase: '#e5e7eb',
  borderRadius: 4,
  fontFamily: 'Outfit, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyCode: '"Fira Code", "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
};
const DARK_LAYOUT_TOKENS = {
  bodyBg: '#040507',
  headerBg: '#08090c',
  headerColor: '#00f0ff',
  footerBg: '#040507',
  siderBg: '#08090c',
  triggerBg: '#0d1117',
  triggerColor: '#00f0ff',
};
const ULTRA_DARK_LAYOUT_TOKENS = {
  bodyBg: '#000000',
  headerBg: '#000000',
  headerColor: '#00f0ff',
  footerBg: '#000000',
  siderBg: '#000000',
  triggerBg: '#070709',
  triggerColor: '#00f0ff',
};
const DARK_MENU_TOKENS = {
  darkItemBg: '#08090c',
  darkSubMenuItemBg: '#0d1117',
  darkPopupBg: '#0d1117',
};
const ULTRA_DARK_MENU_TOKENS = {
  darkItemBg: '#000000',
  darkSubMenuItemBg: '#070709',
  darkPopupBg: '#070709',
};
const DARK_CARD_TOKENS = {
  colorBorderSecondary: 'rgba(0, 240, 255, 0.15)',
};
const ULTRA_DARK_CARD_TOKENS = {
  colorBorderSecondary: 'rgba(0, 240, 255, 0.1)',
};
const STATISTIC_TOKENS = {
  contentFontSize: 17,
  titleFontSize: 11,
};

export function buildAntdThemeConfig(isDark: boolean, isUltra: boolean): ThemeConfig {
  if (!isDark) {
    return {
      algorithm: antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#0090a0',
        fontFamily: 'Outfit, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontFamilyCode: '"Fira Code", "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
      },
      components: {
        Statistic: STATISTIC_TOKENS,
      },
    };
  }
  return {
    algorithm: antdTheme.darkAlgorithm,
    token: isUltra ? ULTRA_DARK_TOKENS : DARK_TOKENS,
    components: {
      Layout: isUltra ? ULTRA_DARK_LAYOUT_TOKENS : DARK_LAYOUT_TOKENS,
      Menu: isUltra ? ULTRA_DARK_MENU_TOKENS : DARK_MENU_TOKENS,
      Card: isUltra ? ULTRA_DARK_CARD_TOKENS : DARK_CARD_TOKENS,
      Statistic: STATISTIC_TOKENS,
    },
  };
}

export function pauseAnimationsUntilLeave(elementId: string): void {
  document.documentElement.setAttribute('data-theme-animations', 'off');
  const el = document.getElementById(elementId);
  if (!el) return;
  const restore = () => {
    document.documentElement.removeAttribute('data-theme-animations');
    el.removeEventListener('mouseleave', restore);
    el.removeEventListener('touchend', restore);
  };
  el.addEventListener('mouseleave', restore);
  el.addEventListener('touchend', restore);
}

interface ThemeContextValue {
  isDark: boolean;
  isUltra: boolean;
  toggleTheme: () => void;
  toggleUltra: () => void;
  antdThemeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(initialDark);
  const [isUltra, setIsUltra] = useState<boolean>(initialUltra);

  useEffect(() => {
    applyDom(isDark, isUltra);
    localStorage.setItem(STORAGE_DARK, String(isDark));
    localStorage.setItem(STORAGE_ULTRA, String(isUltra));
  }, [isDark, isUltra]);

  const toggleTheme = useCallback(() => setIsDark((v) => !v), []);
  const toggleUltra = useCallback(() => setIsUltra((v) => !v), []);

  const antdThemeConfig = useMemo(() => buildAntdThemeConfig(isDark, isUltra), [isDark, isUltra]);

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, isUltra, toggleTheme, toggleUltra, antdThemeConfig }),
    [isDark, isUltra, toggleTheme, toggleUltra, antdThemeConfig],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
