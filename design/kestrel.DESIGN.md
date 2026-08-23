# Kestrel Tenant Desk — DESIGN.md (2026-08-22)

Subject owns three words: **office, binder, warm.** A 40-unit property manager's front desk, not a chatbot startup.
Signature (one): **the policy stack.** Five document slabs above the library; the cited one slides out and tilts toward you. Everything else stays quiet.
Gold standard for the judge: Help Scout Docs + Intercom Messenger's "sources" pattern (answer with its article surfaced beside it), judged on calm density and legibility, not on their palettes.

## Color (semantic) — "ledger, not lounge" (revised 2026-08-23, Angel: no cream/terracotta, stay light)
- `--paper` #f3f4f1 (cool off-white), `--paper-deep` #e9ebe6, `--card` #ffffff, `--card-2` #f6f7f4
- `--ink` #161d19 (green-cast near-black), `--ink-2` #4f5a54, `--ink-3` #68736c
- `--line` rgba(22,29,25,.11), `--line-soft` rgba(22,29,25,.065)
- `--accent` #1d6b4f ledger green (the ONE accent), `--accent-deep` #14503a for small text, `--accent-wash` rgba(29,107,79,.09), `--accent-ring` rgba(29,107,79,.38), `--on-accent` #f2fbf6
- `--status` #b3261e: appears ONLY in the emergency pill (dot, text, ring)
- Dark: `--paper` #101412, `--card` #171c19, `--card-2` #1c221e, `--ink` #e9efeb, `--ink-2` #a9b4ad, `--ink-3` #8d988f, `--accent` #4fb58d, `--accent-deep` #7fd0ad, `--status` #ef6f66
- No gradients as identity. One green. Slabs are white with green index tabs.

## Answers
- Bot answers render as **excerpt cards** (`.xc`): 3px green left rule, header bar = DOCUMENT (mono caps) + section (bold) + §n, body = the passage. The header is the citation and is a button that lights the library row (and scrolls to it under 900px, where a mono foot hint appears). The greeting and the office fallback stay plain bubbles.

## Type
- Display: Clash Display Semibold (self-hosted, FFL). h1 clamp(1.7rem, 3.2vw, 2.2rem)/1.05 -0.02em; panel titles 1.02rem. Slab titles drawn at 58px on a 512x672 canvas, near-right corner.
- Body/UI: Satoshi Medium 0.95rem/1.55 (user bubbles too); Satoshi Bold for buttons, chips and doc names.
- Mono: ui-monospace stack for eyebrows, sources, section ids. 0.66rem, 0.10em tracking, uppercase.
- `font-variant-numeric: tabular-nums` on phone numbers, prices, dates.
- Bubbles `max-width: 58ch` (Satoshi renders that at ~70 real characters).

## Space
8px base. 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Page gutter 24 (16 on phone). Column gap 32. Card padding 20. Panel padding 18.

## Radii (by class)
Cards 18 · bubbles 14 (2 on the sender corner) · chips 999 · inputs 12 · buttons 12 · library rows 8 · stack canvas 14.

## Shadow
- card: 0 1px 2px rgba(46,30,16,.05), 0 10px 28px rgba(46,30,16,.07)
- lift (active row / sent bubble): 0 4px 14px rgba(194,90,30,.16)

## Motion
- 140ms feedback, 260ms enters (opacity+transform only), stagger 40ms. Thinking dots after 250ms. Stack: the cited slab slides right (x 1.7), rises above the stack (top + 0.4), tilts -0.2 rad; eased at 0.085/frame, render loop stops when settled (idle rAF 0). All gated by prefers-reduced-motion (stack renders one frame per change).

## Layout
- Sticky top bar 56px: mark + name left; office hours + phone and an EMERGENCY pill right (keeps the word Emergency on phones); SAMPLE · INVENTED BUSINESS chip sits in the bar on wide screens and above the headline under 600px, never fixed over content. Footer: one accent CTA (Build something like this), the rest quiet ink-2.
- Desk: grid `minmax(0,1fr) 360px`, max 1180px. Left card = chat (log, chips, input). Right panel = stack canvas (210px) + library list grouped by document, 16 rows.
- Under 900px: one column, library below chat (the source chip under each answer taps through to the lit row), stack 190px, list capped at 260px and self-scrolling. 375px flawless.

## Honesty
Sample label visible on every viewport. "16 sections" is counted from the data, not typed. No stats, no testimonials, no "AI" anywhere on the page.
