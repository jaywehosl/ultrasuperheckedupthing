# Redesign — open TODOs

## NEXT (high priority): global "modal open" layout jump

**Symptom (reported live):** when a DS `Dialog` opens, the *entire* modal content nudges
up ~2px — including text inside fields/labels — and the switch *track* (`.ds-switch`
background) shifts slightly too. The thumb (pill) itself now renders correctly; this is
NOT switch-specific. It is a **global** effect and must be fixed globally, not per-component.

Already ruled in/out:
- In/out open/close animations are correct and symmetric (Radix `data-state`), no flicker. ✅
- Horizontal few-px content jump on the page behind = fixed via `html { scrollbar-gutter: stable }`. ✅
- Switch thumb position on first paint = fixed (animate `left`, not `transform`). ✅

Likely causes to investigate (cheapest first):
1. **GPU layer promotion text reflow**: the `.ds-dialog__content` has `backdrop-filter`
   + a `transform: translate(-50%,-50%)` + an entrance `animation` (transform). When the
   pop-in animation ends, the element is demoted from its composited layer; text is
   re-rasterized at a slightly different subpixel position → the "jump up ~2px".
   - Try: keep the content on a stable layer (e.g. `will-change: transform` permanently,
     or `backface-visibility: hidden`), OR snap the final transform to whole pixels, OR
     animate via `opacity` only (no transform) for the content so there is no transform
     layer to settle.
2. **Half-pixel centering**: `translate(-50%,-50%)` on an odd-width/height box yields a
   .5px offset that the compositor rounds differently during vs after animation.
   - Try: center with fl/grid (`place-items:center` on a fixed full-screen wrapper) instead
     of `translate(-50%,-50%)`, so position is integer-snapped.
3. The switch track shift is probably the same layer-settle issue (the switch sits inside
   the content layer).

Suggested approach: fix the dialog centering/animation so no transform layer needs to
settle (option 2 is the cleanest — wrap content in a flex-centering fixed overlay-sibling
and drop the translate centering), then re-verify the switch track no longer moves.

## After that
- Finalize/commit the modal canon (already mostly done): fields=login, buttons=logout,
  Select=header language dropdown, switch=standard toggle, overlay=plain blur.
- Continue page migration per plan: **settings** (Panel Settings) next, then clients,
  then inbounds / xray (the monsters). Add DS `Tabs` (Radix) when settings needs it.
- Extend nothing else until the modal jump is fixed (it affects every DS Dialog).

## Notes / gotchas (learned this session)
- `backdrop-filter` dies if ANY ancestor has transform / opacity<1 / filter / animation /
  will-change / contain / isolation. The `.feed-section` entrance animation silently broke
  panel glass for two sessions. Never wrap glass surfaces in such elements.
- The automated browser tab runs backgrounded (`document.hidden`), which pauses the
  particle rAF — screenshots taken via automation show a blank canvas. Visual verification
  of glass/particles must be done by the user on the active tab.
- `vite.config.js` holds the live server target + base path (secret) — never commit it.
