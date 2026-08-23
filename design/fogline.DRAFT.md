# Fog Line Cycles — direction draft (2026-08-23)

Not built yet. This is the proposal to approve or redirect, same method as [The Brass Pelican](pelican.DESIGN.md): one identity, one signature, one 3D object tied to the function, and a competence layer the client cannot see but benefits from.

## What the shop is

Three words: **honest, technical, unhurried.** A neighbourhood repair shop whose whole pitch is that nobody touches your bike before you know the number. The existing copy already says it: "We'll call before doing anything expensive."

The current page is competent and completely generic: mono type on near-black, no imagery, no mark, no material. It reads like a developer's demo of a booking flow, which is exactly what it is.

## The idea: the shop tag, annotated

**Revised 2026-08-23 after a Dribbble sweep. The chainring is out.** Twelve references pulled across bike-shop identity and workshop/repair branding. The sweep mostly returned exactly what I was about to build: a cog rendered as a letter (GoldCoast Cycles, 8188869), a gear-and-wrench crest (ExtremeMoto, 15911665), a mascot badge with flames (Superior Diesel, 25881505), and the full template site with stock photography, TRUST / QUALITY / KNOWLEDGE badges and a Google rating chip (Bumpers Etc, 27629675). A chainring roundel would have landed in the middle of that pile.

Two shots did something else, and they are doing the same thing as each other:

- **LATRO, The City Annotated (27418897)** — a tyre sidewall shot close, with the real markings as the design: `TPI 120 / FOLDING BEAD`, `MAX PSI 110 / MIN PSI 80`, `CASING: NYLON REINFORCED`. The brand language is the spec printing that is already on the part.
- **Parts Museum, Beijing Design Week (26919897)** — objects built from scrap presented as museum specimens, each with a catalogue card: class, height, width, materials, maker.

Both make the *annotation* the identity rather than drawing a logo of the subject. That is the direction.

**So: Fog Line's brand language is the spec marking.** Every part of a bicycle already carries printed technical type, and every repair shop already writes a tag. The site adopts that vocabulary as its own.

**Mark.** Not a roundel. A **stamped type lockup** — `FOG LINE` over `CYCLES / SF` in the condensed technical face used on component markings, boxed like a part stamp. Reads as something stamped into the frame rather than designed in a browser.

**System, and it replaces the repeating tile.** An **annotation kit**: leader lines with callouts, dimension rules, and small spec blocks. Used in three places:
- over the hero photograph, calling out real parts (`SHIMANO 105 / 11-SPD`, `TORQUE 40 Nm`)
- as section numbering, set like spec-sheet clauses (`§ 02 / WHAT IT COSTS`)
- on the work tag itself, which is already a spec card

This is stronger than a pattern tile because it carries meaning: every annotation says something true about the shop's work.

**Signature.** Still the work tag, and now the whole page agrees with it: a tag is a spec card, and the site is written in spec cards.

## The 3D piece: the tag fills itself in

Unchanged and now better justified. A cardboard work tag hangs beside the booking flow, swinging very slightly, and **fills in live** as the customer picks a service, describes the bike and sets their estimate ceiling. By the last step it is the tag they print. The object is the form's output, not a decoration of it.

Procedurally cheap: a rounded card, an eyelet, a string, text drawn to canvas. No bicycle modelling, which would look bad and cost a day.

## Palette — two options, both light

**A. Blueprint (recommended)**
| role | value |
|---|---|
| paper | `#F1F0EC` cool off-white |
| ink | `#141A1F` |
| accent | `#1B4C7A` cyanotype blue |
| warn | `#B4531C` estimate and approval only |
| rule | graphite `#5A6570` |

Reads as a spec sheet, which is the shop's actual argument, and it is the palette the annotation system needs: dimension lines, callouts and part numbers only work on a technical ground. Nothing about it is a generator default, and it stays clear of Pelican's green and Kestrel's green.

**B. Hi-vis workshop**
Warm concrete `#EDEAE4`, graphite `#22262A`, and one hit of hi-vis `#C6D92E`. Genuinely a bike-shop colour and nobody picks it. Risk: hi-vis fails contrast at small sizes, so it could only ever be a fill behind dark ink, never type.

I would take **A** and keep a single warm orange strictly for the estimate-authorisation moment, so the one place money is involved is the one place the page changes colour.

## Photography (Sorceress, four frames, same method as the bar)

Generate the first, then feed it back as reference so the shop is the same room in all four.
1. Workshop bench, tools on a pegboard wall, 16:9 — hero.
2. A wheel in a truing stand, hands adjusting spoke tension, 1:1.
3. A drivetrain close up, chain and cassette, degreaser rag, 1:1.
4. The shop front from the street, bikes outside, 9:16.

## Structure

- Sticky bar: the stamped type mark, SAMPLE label, hours, BOOK A REPAIR.
- Hero: the bench photograph, mark and the promise line, the shop's phone.
- **Book a repair**: the existing five-panel flow untouched, with the 3D tag alongside filling in as you go.
- **What it costs**: the six services as a real price list, "bike is making a weird noise" given its own treatment because it is the honest one.
- **The shop board** (existing demo view): full bleed on ink, so the page has the light/dark cadence Pelican gained. This is the "he builds internal tools" moment and it deserves the strongest section.
- Statement band: the shop's rule, set large. "Nothing expensive happens without a phone call."
- Find us, hours, developer note, footer.

## The competence layer

`LocalBusiness` / `BicycleStore` structured data with opening hours **and a service catalogue**: every repair published as an `Offer` with its price and duration, so a search for "brake service near me" can surface the shop's actual prices. That is the repair-shop equivalent of the bar's event feed, and it is the thing a real owner would not know to ask for.

Same honesty rule as Pelican: the shop is invented, so the page carries `noindex` and says on itself that the imagery and identity were made for the sample.

## What I need from you

1. Palette **A** blueprint or **B** hi-vis workshop.
2. The tag-fills-itself 3D piece: confirm, or name something else.
3. Whether to spend four more Sorceress generations on shop photography. The annotation system needs photographs to annotate, so without them the callouts lose most of their point and the identity leans entirely on type.
