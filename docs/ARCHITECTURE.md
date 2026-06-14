# Community Panel — Architecture & Design

A structural guide to **how** Community Panel is built (technical) and **why**
(the ideas behind it). It assumes familiarity with upstream
[3X-UI](https://github.com/MHSanaei/3x-ui); this document only covers what we
changed or added.

---

## Part I — Theory (the ideas)

**A learning project, built with AI.** The goal was never "a better panel" — it
was to take a real, non-trivial codebase and **rebuild its entire UI** as a
practical study of AI-assisted development. The Go backend is kept intentionally
close to upstream so the panel keeps working; the divergence is the frontend and
the build/UX glue.

**One cohesive design language.** A single glassmorphic, glossy look (frosted
`backdrop-filter` surfaces, an ambient aura, a WebGL particle field) applied
consistently — instead of stock Ant Design.

**Everything controllable, nothing hard-coded.** Visual values flow from design
tokens, so a single Appearance page can retune the whole UI (colours, glass,
radius, shadows, fonts, background, effects). When a value "didn't react", the
fix was always to route it through a token rather than special-case it.

**Finished tools over features-for-features'-sake.** The installer/CLI was
modelled on eGames' [remnawave-reverse-proxy](https://github.com/eGamesAPI/remnawave-reverse-proxy)
as an example of a *complete, genuinely useful* tool. We reused his scripts/CLI
as a reference — not his ideas.

**Security by not-being-there.** The recommended deployment hides the panel
behind a reverse proxy + cookie-gate so it's invisible to scanners (see Part II).

---

## Part II — Technical

### Frontend
- React 19 + TypeScript + Vite, served by the Go binary via `//go:embed`.
- Ant Design was incrementally replaced by a hand-rolled **DS** component library
  (dialogs, tables, forms, tabs, menus, cards, toasts) on **Radix UI** primitives
  + **TanStack Query/Table**, CodeMirror for the JSON editor, Zod for validation.
- A generated OpenAPI client wraps the REST API.

### Theming engine
- `frontend/src/styles/tokens.css` — the single source of truth (~design tokens):
  colours, glass blur/saturation, radii ramp, elevation, motion, the ambient
  `--aura-*` (the dominant lobe follows `--color-primary`), and derived accents
  (`--color-primary-strong` / `-soft` via `color-mix` / rgb so a custom Primary
  drives them).
- `frontend/src/theme/themeApply.ts` — `themeToCss()` (pure) builds an override
  `:root{…}` written into one managed `<style id="uup-theme-overrides">`, so the
  whole UI repaints instantly. It expands `--radius-scale` across the radius ramp,
  scales elevation alphas by `--shadow-intensity` via `calc()`, emits `@font-face`
  for uploaded fonts, and exposes `DEFAULT_THEME` (Community Panel factory theme).
- **Server-canonical persistence.** Theme is a Go `panelTheme` setting, served
  publicly at `/theme.json` and saved via `POST /panel/setting/theme` (JSON —
  the axios interceptor would otherwise form-encode it). No-flash boot: Go inlines
  `window.X_UI_THEME` into the served HTML before any JS runs; the sub page mirrors
  the theme the same way. `bootstrapTheme()` prefers the injected copy, then the
  localStorage cache, then `DEFAULT_THEME` on a fresh install.

### Notification subsystem
- `frontend/src/stores/notificationStore.ts` — a framework-agnostic store
  (`useSyncExternalStore`) holding `history`, `active` (event notifications),
  `dismissed` (silenced live alerts), `sensorAcked`, and prefs (`prefs`,
  `sensors`, `logWatch`), all localStorage-persisted.
- **Two models.**
  - *Live conditions* (security/xray/restart, and the status sensors
    CPU/RAM/disk/TCP/UDP/uptime) are **derived** in `useNotifications` from the
    polled status via `lib/notifications/statusSensors.ts` — they show the current
    value, auto-update (~2 s), and auto-clear. Dismiss = ack-until-clear; never
    logged to history (no spam).
  - *Events* (failed-login from the log watcher, client-offline) use `active` +
    `pushEvent(dedupKey)` and **edge-triggering** (fire on the false→true
    transition, re-arm on reset) so a re-occurrence is a *new* notification and a
    dismissal never permanently silences a rule.
- Headless watchers (`SensorWatcher`, `ClientOfflineWatcher`, `LogWatcher`) are
  mounted once in `PanelLayout`. The DS toast store mirrors string toasts into
  history. The status-bar strip + bell render live conditions + active events.

### Safety & resilience
- **Lock-out guard** (`DangerConfirmModal`) gates Save on access-critical fields
  (panel/sub port/listen/domain/base-path/cert) with a countdown + ack + backup.
- **Restore** (`BackupModal`) treats the import as a disruptive restart: it polls
  `/server/status` until the panel returns, then reports success — instead of
  hanging on a request the proxy drops mid-restore.
- The global axios 401 interceptor force-reloads to login; theme-save passes
  `skipAuthRedirect` so a 401 on the (unauthenticated) login screen doesn't reload
  the page.

### Installation (turnkey reverse-proxy + cookie-gate)
`install.sh` mode A: prompts three distinct domains (panel, subscription,
selfsteal/Reality decoy) → issues Let's Encrypt certs (HTTP-01) → writes an Nginx
config with **3 SNI vhosts on a single port 443** → puts the panel behind a
**cookie-gate** that returns the decoy site unless a secret auth cookie is present
→ restarts. Result: one port, no port/path in URLs, and a panel that doesn't
answer scanners. This is why the lock-out guard exists — changing the panel's
port/path/domain breaks the proxy contract.

---

## Where things live

| Area | Path |
|---|---|
| Design tokens | `frontend/src/styles/tokens.css` |
| Theme engine | `frontend/src/theme/` (`themeApply.ts`, `themeStorage.ts`) |
| Appearance page | `frontend/src/pages/appearance/` |
| Notification store | `frontend/src/stores/notificationStore.ts` |
| Sensors / watchers | `frontend/src/pages/index/` (`SensorWatcher`, `ClientOfflineWatcher`, `LogWatcher`), `frontend/src/lib/notifications/` |
| Status-bar strip | `frontend/src/pages/index/NotificationsBar.tsx` |
| Safety modal | `frontend/src/components/ui/DangerConfirmModal.tsx` |
| Backup / restore | `frontend/src/pages/index/BackupModal.tsx` |
| Installer / CLI | `install.sh`, `x-ui.sh`, `docs/nginx-template.md` |
