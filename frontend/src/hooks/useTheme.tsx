import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_DARK = 'dark-mode';
const STORAGE_ULTRA = 'isUltraDarkThemeEnabled';

function applyDom(isDark: boolean, isUltra: boolean) {
  const root = document.documentElement;
  // Theme lives on <html> so portaled surfaces (Modals, toasts, dropdowns that
  // mount on document.body) resolve the same theme as in-flow content.
  root.classList.toggle('is-dark', isDark);
  root.classList.toggle('is-ultra', isDark && isUltra);
  if (isDark && isUltra) {
    root.setAttribute('data-theme', 'ultra-dark');
  } else {
    root.removeAttribute('data-theme');
  }
  // Legacy `body.dark` / `body.light` convention still used by many rules.
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('light', !isDark);
  const msg = document.getElementById('message');
  if (msg) msg.className = isDark ? 'dark' : 'light';
}

// Reset localStorage cache to default to Google Antigravity Light Theme on first load of this session
const CACHE_RESET_KEY = 'antigravity-reset-v3';
if (localStorage.getItem(CACHE_RESET_KEY) !== 'true') {
  localStorage.setItem(STORAGE_DARK, 'false');
  localStorage.setItem(STORAGE_ULTRA, 'false');
  localStorage.setItem(CACHE_RESET_KEY, 'true');
}

// module load so the document is in the right theme before React mounts.
// Dark theme temporarily removed system-wide — single light theme only.
// (The toggle button stays; dark will be rebuilt from scratch off the light one.)
const initialDark = false;
// AMOLED / "ultra dark" theme removed — there is now a single systemic dark theme.
const initialUltra = false;
applyDom(initialDark, initialUltra);

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

  // no-op for now: dark theme removed system-wide, keep the button as a placeholder
  const toggleTheme = useCallback(() => {}, []);
  void setIsDark;
  // no-op: the AMOLED/ultra theme was removed, keep the API for compatibility
  const toggleUltra = useCallback(() => {}, []);
  void setIsUltra;

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, isUltra, toggleTheme, toggleUltra }),
    [isDark, isUltra, toggleTheme, toggleUltra],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
