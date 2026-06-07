# Ultra Uber Panel — Design Guidelines

Design language: **Google Antigravity × Apple Vision OS / macOS 26** — premium frosted
glass, depth, ambient motion, springy micro-interactions. This is the canonical spec to
follow when restyling any surface. When in doubt, match the **login screen** (the reference
implementation) and the tokens below.

> Single source of truth for values: `frontend/src/styles/tokens.css`.
> Reference implementations: `frontend/src/pages/login/LoginPage.css`,
> `frontend/src/styles/custom-ui.css`, `frontend/src/styles/page-shell.css`,
> `frontend/src/components/ui/ParticleField.tsx`.

---

## 1. Theme

- **One systemic LIGHT theme only.** Dark + AMOLED/"ultra" were removed (`useTheme.tsx`
  forces `isDark=false`, `toggleTheme`/`toggleUltra` are no-ops). The theme toggle button
  stays as a stub — dark theme will be **rebuilt from scratch later** using light as the
  template (just re-coloured). Don't add dark-only styling for now.
- Legacy `.is-dark` / `body.dark` / `.is-ultra` CSS branches are dormant (never activate);
  leave them, they'll be replaced when dark is rebuilt.

## 2. Tokens (`tokens.css`)

Use tokens, never hard-coded values, in new/refactored CSS.

- **Palette:** primary `--color-primary` = `#3279F9` (`--color-primary-rgb: 50,121,249`).
  Accents: success `#34a853`, warning `#f5a524`, error `#ea4335`.
- **Spacing (8-pt):** `--space-1..9` = 4,8,12,16,24,32,48,64,96.
- **Radii:** xs 8 / sm 12 / md 16 / lg 20 / xl 24 / 2xl 28 / pill 9999.
  Fields & dropdowns = **14px**; cards = 24–28px.
- **Glass blur tiers:** `--glass-blur: 30px` (canonical) · `--glass-blur-soft: 18px` ·
  `--glass-blur-strong: 44px`; always pair with `saturate(180%)`.
- **Surfaces:** `--surface-1/2/3` (0.55/0.70/0.82 light) + `--surface-border`, `--hairline`.
- **Elevation:** `--elev-1..4` (layered, perceptible — never the old `alpha 0.02` flat shadow).
- **Specular rim:** `--specular` = `inset 0 1px 0 rgba(255,255,255,0.7), inset 0 0 0 1px rgba(255,255,255,0.16)`.
- **Hover:** `--hover-glow` (see §4). **Focus:** `--ring-focus`.
- **Motion:** `--ease-out-expo`, `--ease-spring`; `--dur-fast/mid/slow` = 130/220/380ms.
- **Type:** `--font-sans` (Plus Jakarta Sans), `--font-display` (Outfit), `--font-mono`.

## 3. Glass surfaces

The canonical frosted panel (cards, dropdowns, modals, popovers):

```css
background: rgba(255, 255, 255, 0.32);          /* lighter (0.22) for panels over busy content */
backdrop-filter: blur(30px) saturate(180%);     /* --glass-blur; soft 18 / strong 44 for layering */
-webkit-backdrop-filter: blur(30px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.5);     /* bright glass kant */
border-radius: 14px;                            /* cards: 24–28 */
box-shadow:
  0 20px 50px rgba(18, 19, 23, 0.16),           /* elevation */
  inset 0 1px 0 rgba(255, 255, 255, 0.6);       /* specular highlight */
```

Layer different blur tiers + opacities for depth (e.g. header = soft blur, card = canonical,
overlays = strong). Frost should read from the first frame (see §8 popover note).

## 4. Canonical hover — the "reverse glow"

ONE hover effect across **all** interactive elements (buttons, inputs, dropdown items,
dropdown panel, toggles). Inner blue-tinted shadow + blue kant; reads as a soft lift.

```css
/* base: ensure a border exists so the kant can appear, and a transition */
border: 1px solid transparent;
transition: border-color .2s ease, box-shadow .2s ease;

/* :hover */
border-color: rgba(50, 121, 249, 0.5);
box-shadow:
  inset 0 1px 4px rgba(50, 121, 249, 0.22),
  inset 0 7px 16px rgba(50, 121, 249, 0.12),
  inset 0 1px 0 rgba(255, 255, 255, 0.6);
```

Do NOT use ad-hoc hovers (brightness filters, translateY "float", flat fills, antd's
rotating shine `::after`). Remove those and apply the above.

## 5. Buttons & controls

- **No solid-blue buttons.** Buttons are frosted **surfaces** (same as fields):
  `background: rgba(255,255,255,0.32)`, dark text `#14151b`, 14px radius, blur 10–30,
  `border: 1px solid rgba(18,19,23,0.1)`, canonical hover. (Primary emphasis = weight/size,
  not a blue fill — revisit if a stronger CTA is needed.)
- Inputs/fields: 14px radius, frosted translucent, prefix icons tinted `--color-primary`,
  canonical hover, focus uses `--ring-focus`.

## 6. ParticleField — the signature shader

Component: `frontend/src/components/ui/ParticleField.tsx`. GPU-rendered (WebGL2 points),
**CPU-simulated in real pixels**. Renders nothing if WebGL2 is unavailable (CSS aurora is
the fallback). Mounted behind the glass shell (`PanelLayout`) and on login.

**Model = air-hockey pucks (this is the agreed feel):**
- Each particle glides with its own momentum on near-zero friction; **does NOT spring back
  to a home** — it stays where physics leaves it.
- **Collisions are visual-true:** collision radius = the rendered size (`diameter * COL_SCALE`),
  mass ∝ area → a big puck shoves small ones, momentum cascades. Uniform spatial grid for
  neighbours. Elastic with restitution. (The earlier bug: sim radius ≫ dot size → dots
  "repelled" from afar and never visually touched. Keep sim size == visual size.)
- Bounce off the screen walls; a faint "air" jitter keeps the table gently alive.
- **Cursor = a paddle that only acts while MOVING** (speed-gated: `gate = min(1, mspeed/4)`):
  radial shove + a wake along the cursor's travel. A *still* cursor exerts **zero** force, so
  the field relaxes — no static "magnifying-glass" hole. No canned/constant swirl (rotation
  comes from how you actually move).
- Sizes vary (`SIZE_MIN + SIZE_RANGE * rand²` → many small, few large = layered depth).
  Per-particle hue across the palette; **speed lifts brightness, never size**. Crisp orb +
  faint halo (large pucks must not be muddy).

**Final tuned constants (px / px-per-frame):**
`SIZE_MIN 4`, `SIZE_RANGE 18`, `COL_SCALE 0.46`, `FRICTION 0.985`, `JITTER 0.02`,
`CUR_R 120`, `PUSH 6.0`, `DRAG 0.55`, `REST 0.9`, `WALL 0.86`, `MAXV 11`,
count `= clamp(area/320 * density, 2200, 5500)`, dpr capped at 1.75.
Palette `['#3279F9','#A855F7','#14B8A6']`.

**Usage:** `<ParticleField density intensity additive monochrome interactive palette />`.
- Login: `density 1`, `intensity 0.95`. Panel shell: `density 0.8`, `intensity 0.7`.
- `additive` (glow) + higher dark intensities are **reserved for the rebuilt dark theme**
  (great on dark, blow out on light). Respects `prefers-reduced-motion`; pauses when hidden.

## 7. antd v6 styling gotchas — CRITICAL for the panel pass

antd is **still present** (not removed); we restyle it. Many legacy selectors silently miss
in v6 — **verify every selector against the live DOM** (inspect computed styles), don't trust
class names from memory.

- **Popover/Menu surface = `.ant-popover-container`** (NOT `.ant-popover-inner`, which does
  not exist in v6). Content wrapper = `.ant-popover-content`. Hide `.ant-popover-arrow`.
- Popover is positioned via `inset` (not `transform`) → safe to set
  `.ant-popover { transform: none; animation-duration: 0.001ms; }` to kill the zoom-scale +
  opacity-fade that makes `backdrop-filter` render glitchy / "frost catches up" on open.
- antd menu items default to `width: calc(100% - 8px)` with `margin:0` → asymmetric. Force
  `width: 100%` for symmetric padding on all sides.
- Likely also stale and worth re-checking on the panel: `.ant-select-dropdown`,
  `.ant-dropdown-menu`, `.ant-modal-*`, `.ant-table-*`, `.ant-drawer-*`, `.ant-tabs-*`,
  `.ant-input*`, `.ant-switch`. (Some glass overrides in `page-shell.css`/`custom-ui.css`
  may not be applying — that's a top cause of "dull/unstyled" spots.)
- antd uses `:where()` (zero specificity) → our overrides usually need `!important`.

## 8. Working method

- **The agent (Chrome MCP) cursor does not reliably trigger/show `:hover` in screenshots.**
  Verify hover states via JS computed `:hover` styles, or rely on the user's eyes.
- Dev: `localhost:5173`, base path from DB (currently `/coJpMqKdrFlouPQOlj/`), Vite HMR.
  After a dev-server restart, hard-refresh the tab (Ctrl+Shift+R) or HMR may be stale.
- `vite.config.js` holds a temporary deploy-specific `webBasePath`/backend IP — left
  uncommitted on purpose (public repo); cleaned at prod rollout. Don't commit it.
