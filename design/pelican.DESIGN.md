# The Brass Pelican — DESIGN.md (rewritten 2026-08-23)

Subject owns three words: **green, brass, late.** An upscale-casual cocktail bar with live music, run by an owner who books the room from his phone. Not a dive, not a nightclub, not a hotel lobby.

Signature (one): **the seal.** An engraved pelican inside a ring of type. It appears flat in the header and footer, and alive in the round beside Tonight, where the same artwork is struck into a disc and flips on click to show what is on tonight.

Gold standards for the judge: Lotti Dotti and The Wild for identity; Amber & Salt for editorial restraint. Judged on hierarchy and honesty, never on their palettes.

## Colour (locked by Angel 2026-08-23)
- `--bone` #EFEBE1 page, `--bone-2` #E6E1D5, `--card` #FBF9F4
- `--ink` #14261F, `--ink-2` #3E4F47, `--ink-3` #5F6E66
- `--forest` #1B4D3E (the one accent), `--forest-deep` #123529 for full-bleed bands
- `--brass` #8C6A2F for rules, borders and metal only; `--brass-text` #755722 whenever brass carries type (the raw brass fails AA on bone at small sizes)
- `--danger` #A81E17 light / #F0958C dark, form errors only
- Dark scheme mirrors all of the above; `--brass-text` becomes #D9B466
- No gradients as identity, no glow, no text-shadow anywhere.

## Type
- Display: Clash Display Bold/Semibold, self-hosted (FFL). h1 clamp(2.4rem, 6.2vw, 4.4rem); the statement band peaks at clamp(2rem, 5.4vw, 4rem).
- Body/UI: Satoshi Medium; Bold for buttons and labels.
- Mono: ui-monospace for eyebrows, meta, prices, hours. Tabular figures on every time and price.
- Prose measure 60-70 characters.

## The kit (assets/brand/)
- `crest.png` / `crest-light.png` — the engraved pelican, keyed to transparent, dark and light.
- `seal.svg` — the crest inside live circular type. Inline it; embedding via `<object>` cuts it off from `currentColor`.
- `lattice.svg` — the wing lattice, a deco feather-scale tile, seamless by construction. Applied as a **mask** with `background-color: currentColor`, never as a background image, so it takes the palette in both schemes.
- `bar-backbar.webp` (hero), `bar-hands.webp` (drinks), `bar-stage.webp` (private hire) — generated for this sample and said so on the page.
- `assets/pelican-medallion.js` — the seal in three dimensions. Obverse is the seal; reverse is tonight's show; it settles and then stops drawing (idle rAF 0).

## Layout
- Sticky bar 60px: mark, wordmark, sample label at every width, hours, outline TONIGHT.
- Hero: the back-bar photograph under a scrim, seal and wordmark over it. The Tonight card **rides up over the photograph's bottom edge**, so the page does not read as stacked bands.
- Tonight: the card, with the medallion beside it. Click or Enter flips the medal.
- This Week: **full bleed on deep green**, giving the page a light / dark / light cadence. Week cards, the detail panel, the month grid and the owner editor all invert inside it.
- Drinks: cocktail list with dotted leaders beside the mixing-glass photograph.
- Statement band: the house line, full bleed on forest with the lattice behind it. The type scale's peak.
- Private hire: form beside the stage photograph.
- Find us, developer note, footer with the seal.
- 320 and 375 flawless, no horizontal scroll, inputs 16px, targets 44px, with one stated exception: a seven column month grid cannot yield 44px-wide days below about 360px. At 375 a day is 48x56; at 320 it is 40x56, which clears WCAG 2.5.8's 24px minimum but not the house 44px rule. The week list above carries the same information at full size, so the grid is the secondary path on phones.

## Structured data
Search engines cannot read a rendered calendar, so the page emits schema.org data twice over: a static `BarOrPub` venue record in the head, and an `@graph` of `MusicEvent` records rebuilt by the engine on every render (so an owner-added show reaches the feed in the same pass). Events carry ISO-8601 start times with a timezone offset, doors as `doorTime`, cover as an `Offer`, and the venue inline as well as by `@id`.

Because the venue is invented, the page carries `<meta name="robots" content="noindex, nofollow">`. Publishing a fictional bar's events as genuine records would be dishonest; the markup stays fully valid and testable in Google's Rich Results Test either way.

## Honesty
Sample label visible in the sticky bar at every width. The developer note and the footer both state that the identity was drawn for the sample and the photographs were generated for it. No stats, no testimonials, no press, and the word AI is never applied to anything the page does.
