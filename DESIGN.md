# Inkead Design System & UI/UX Guide

Inkead follows an **Apple-inspired editorial minimalism** philosophy: quiet surfaces, crisp typography, deliberate hierarchy, and hardware-accelerated motion that never distracts from reading.

---

## 1. Core Surface & Color Tokens
All components must consume CSS custom properties rather than hardcoding hex backgrounds:
- **Canvas / Primary Background:** `var(--bg-primary)`
- **Elevated Surface / Inputs / Pills:** `var(--bg-surface)`
- **Cards / Popovers / Modals:** `var(--bg-card)` (solid background on text-heavy overlays to preserve subpixel font clarity)
- **Hairline Borders:** `var(--border-color)` and hover `var(--border-hover)`
- **Typography:** `var(--text-primary)` (high contrast) and `var(--text-muted)` (secondary metadata)
- **Primary Accent:** `#0071E3` (Light) / `#2997FF` (Dark) — used sparingly for active selections, focus states, and primary actions.
- **Semantic Accents:** Destructive `#D92D20` / `#FF453A`; Spotify live indicator dot `#1DB954` (dot/icon only — never loud neon borders or rainbow gradients).
- **No Sparkles Rule:** Never use sparkle emojis or sparkle icons anywhere in the UI.

---

## 2. Layout & Proportions
- **Horizontal over Tall:** Multi-section popovers and media panels (such as *Reading Radio*) must expand **horizontally** into balanced 2-column layouts (`680px–740px` wide on desktop) rather than stacking vertically into tall, cramped boxes.
- **Equal Column Alignment:** Side-by-side panels should align cleanly at both top and bottom edges without orphan wrapping pills or awkward scrollbars.
- **Card Borders:** Interactive grid options (e.g., *Typeface*, *Page & Image Auto-Fit*) use individual `rounded-2xl` bordered cards (`border-[var(--border-color)]`) with clear active state feedback.

---

## 3. Typography & Legibility
- **Razor-Sharp Rendering:** Never combine `backdrop-blur-*` and `scale()` transforms on containers holding body text, as it triggers subpixel font blurring on desktop Chromium. Use solid `bg-[var(--bg-card)]` + `antialiased` + pure `opacity` transitions for popovers.
- **Tabular Numerals:** Use `font-num tabular-nums` for percentages, page counters, timers, and zoom scales.
- **Overflow Safety:** Dynamic titles and URLs inside modals/menus must use `truncate` or `break-words [overflow-wrap:anywhere]`.

---

## 4. Motion & Page-Flipping Standards
- **GPU-Only Properties:** Animate exclusively `transform` (`translateX`, `rotateY`, `scale`) and `opacity` with `will-change: transform, opacity`.
- **Easing Curve:** Apple quintic ease-out `cubic-bezier(0.22, 1, 0.36, 1)` (`[0.22, 1, 0.36, 1]`), `140ms–340ms` duration.
- **Stationary Micro-Controls:** Pin markers and icon buttons must not "uplift" (`translateY` / `scale` jump) on hover; use subtle ring/shadow transitions and zero-gap hover bridges.
- **Crossfade Loading:** Embedded players and asynchronous views fade in smoothly (`opacity-0 → opacity-100`) over a `var(--bg-surface)` loading state with `BlinkingDots`.
