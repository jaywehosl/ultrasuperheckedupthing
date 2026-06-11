/**
 * Theme persistence — PLACEHOLDER layer.
 *
 * For now the draft theme is kept in localStorage so the Appearance page is
 * fully interactive and survives reloads. P1 slab 3 swaps these two functions
 * for the server-canonical `GET /theme.json` + `POST /panel/api/theme` (the
 * Appearance page and bootstrap call the same load/save API, so wiring the
 * backend is a localized change here).
 */
import { applyTheme, applyThemeMode, type PanelTheme } from './themeApply';

const STORAGE_KEY = 'uup.panelTheme';

export function loadTheme(): PanelTheme {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PanelTheme) : {};
  } catch {
    return {};
  }
}

export function saveTheme(theme: PanelTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function clearTheme(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Apply the persisted theme at app start. Mode is intentionally left to the
 *  existing theme toggle unless the saved theme pins one. */
export function bootstrapTheme(): void {
  const theme = loadTheme();
  applyTheme(theme);
  if (theme.mode) applyThemeMode(theme.mode);
}
