# Theming / customization system — design

Status: DESIGN → P1 in progress. Lets panel operators restyle the UI (palette,
glass/blur, radius, shadows, fonts, background incl. custom images, interactive
effects) across **panel + login + subscription page**, with a **dark/light**
base and **custom uploads** (background image, fonts).

Decisions locked by boss (2026-06-11): server-canonical storage · scope =
panel+login+sub from day one · light+dark · custom bg + fonts from the start.

---

## 1. Why this is cheap to build

Everything visual already resolves off **~106 CSS custom properties** in
`frontend/src/styles/tokens.css` (`:root`). A theme is just a set of overrides
for a subset of those, injected as `<style>:root{ --token: value }`. The DS reads
tokens, so a change repaints instantly — live preview is free.

**Dark already exists**: `html.is-dark` and `html.is-dark.is-ultra` /
`[data-theme="ultra-dark"]` are full token sets in `tokens.css`; `useTheme.tsx`
toggles the mode class. So we are NOT authoring dark from scratch — the theme
just carries a `mode` and layers user overrides on top of the chosen base.

antd is **gone** (0 component imports, not a dependency — only
`@ant-design/icons`). So token overrides retheme everything directly; **no antd
ConfigProvider bridge needed.**

## 2. Three render surfaces

| Surface | Render | How the theme reaches it |
|---|---|---|
| Panel | React, tokens | apply overrides to `:root` at runtime |
| Login | React, same bundle | same `:root`, BUT pre-auth → must be **bootstrapped into `index.html`** (server-injected `<style>`) to avoid a default-flash |
| Sub-page | **Go template** (`sub/sub.go`, `PageData`) | inject a `ThemeCSS` string of `:root{…}` into the template (modest subset — sub-page is the selfsteal/decoy, keep it DPI-quiet) |

## 3. Data model — `panelTheme` (server setting, JSON)

```jsonc
{
  "mode": "light" | "dark" | "ultra-dark",
  "tokens": { "--color-primary": "#3279f9", "--radius-scale": 1.0,
              "--glass-blur": "30px", "--shadow-intensity": 1.0, "...": "..." },
  "background": { "type": "aura" | "color" | "image",
                  "assetId": "bg_ab12", "dim": 0.35, "blur": "0px" },
  "fonts": { "sans": "Plus Jakarta Sans" | "asset:font_x",
             "display": "Outfit", "mono": "Fira Code" },
  "effects": { "particles": { "on": true, "density": 1, "speed": 1, "color": "primary" },
               "hoverGlow": true }
}
```

- Stored as a single settings key `panelTheme` (string JSON) alongside the other
  settings — same persistence path as everything else.
- Uploaded assets (bg image, font files) live on disk under `/etc/x-ui/theme/`,
  referenced by `assetId`.
- A few **derived/meta tokens** we add to support sliders without enumerating
  every value: `--radius-scale` (multiplies the radius ramp), `--shadow-intensity`
  (scales elevation alpha), `--glass-blur` (already exists). The override layer
  expands a scale into the concrete tokens.

## 4. Backend (Go)

- `GET /theme.json` — **public, unauthenticated**. Returns the active theme so
  login + sub bootstrap before first paint. Cache-control short.
- `GET /theme/asset/<id>` — **public** static serve of an uploaded bg/font.
- `POST /panel/api/theme` — save the theme (authed; validates ranges).
- `POST /panel/api/theme/asset` — upload bg image / font (authed). Validate by
  magic bytes + type + size cap; store under `/etc/x-ui/theme/`.
- **No-flash bootstrap:** the Go handler that serves the embedded `index.html`
  string-injects `<style id="uup-theme">:root{…}</style>` (+ the `mode` class on
  `<html>`) computed from `panelTheme`, so panel & login are themed pre-JS.
- **Sub-page:** `sub/subService.go` `PageData` gains `ThemeCSS`; the template
  renders it inline in `<head>`.
- **CSP:** extend `font-src` / `img-src` to allow `self` (+ `data:`) for uploaded
  fonts/backgrounds (`web/middleware/security.go`).

## 5. Frontend

- **Override core** (`src/theme/themeApply.ts`): `applyTheme(theme)` writes/updates
  a single `<style id="uup-theme-overrides">` with `:root{ --token: val }`, sets
  the `html.is-dark`/`.is-ultra` mode classes, expands `--radius-scale` /
  `--shadow-intensity` into concrete tokens, wires `--bg-image`, and injects
  `@font-face` for uploaded fonts.
- **Store** (`src/theme/ThemeCustomizationContext.tsx`): loads `/theme.json`,
  holds the saved theme + a **live draft** (preview), exposes
  `setOverride/save/reset/export/import`. Save → `POST /panel/api/theme`.
- **Appearance tab** in the [[frontend settings layer]]: accordion groups
  (Palette, Background, Glass & blur, Radius, Shadows, Typography, Effects,
  Mode), live preview, **presets**, Reset, import/export theme JSON, and a
  per-surface scope note (panel+login+sub).
- **Guardrails:** clamp slider ranges; auto-contrast / min-contrast checks on
  text-vs-surface so a theme can't render unreadable; perf cap on blur×particles.

## 6. Token → knob map (abridged)

| Knob | Tokens |
|---|---|
| Primary / accent | `--color-primary` `-strong` `-soft` `-rgb`, `--aura-1..3` |
| Status colors | `--color-success/warning/error` (+ `-rgb`) |
| Background | `--bg-page` `--bg-page-2`, aura hues, NEW `--bg-image` + dim/blur |
| Glass / blur | `--glass-blur` `-soft` `-strong`, `--glass-saturate`, `--blur-xs..xl`, `--surface-1..3` alpha |
| Radius | `--radius-xs..2xl/pill` via `--radius-scale` |
| Shadows | `--elev-1..4`, `--specular`, `--glow-primary` via `--shadow-intensity` |
| Typography | `--font-sans` `--font-display` `--font-mono` |
| Effects | `--hover-glow`, `--glow-primary`, `--ease-*`, ParticleField props |
| Focus | `--ring-focus` `-strong` |

## 7. Phasing

- **P1 — Foundation:** override core + store + provider wiring; Appearance tab
  with Palette / Radius / Blur / Shadows sliders + Mode (reuse existing dark) +
  presets + save/reset/export. Server `panelTheme` + `/theme.json` + no-flash
  bootstrap (panel+login). *(in progress)*
- **P2 — Uploads:** custom background image + custom fonts (asset endpoints,
  storage, CSP, `@font-face`).
- **P3 — Sub-page mirror:** inject `ThemeCSS` into the Go sub template.
- **P4 — Effects:** ParticleField controls, glow/ease tuning.

Cross-cutting: contrast guardrails, perf caps, preset library.

See memory [[theming-system]], [[antigravity-design-ref]], [[customui-migration]].
