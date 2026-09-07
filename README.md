# Modern Money District

Stabledash Live lab spike: a **walkable Three.js city block** and an **Agent Pay Arcade** settlement run. You feel how modern money moves in under a minute, taught by real Live guests, not a quote museum.

**Play:** https://web-production-6efce.up.railway.app/ (hard-refresh after a deploy)

## What changed in this pass (2026-09-07, brand + nostalgia pass)

The block now pulls from the actual Stabledash Live kit instead of approximating it.

- **The real pre-roll is the splash.** `public/media/live-intro.mp4` is the show's own intro (the archival B&W montage: subway, control room, NYSE bell, cash counters) compressed to 960p / 1.9 MB, muted, graded darker behind the title. It also plays on every TV in the block through one shared `VideoTexture`.
- **The real ident is the door sting.** Entering any door plays one second of the MoveMe "You're watching Stabledash LIVE" transition (`public/media/moveme.mp4`, 200 KB). Tap to skip. Skipped under `prefers-reduced-motion`.
- **Real logo, real UI font.** `public/brand/live-logo.png` (white wordmark + chartreuse LIVE) on the splash and street HUD. Aspekta 350/400/450/500 ship from `public/fonts/` (open license). The site's display serifs (Elgraine, FK Roman Standard) are served without CORS headers from stabledash.com and are commercial, so they are not hotlinked or copied into this public repo; Instrument Serif stands in per the brand doc's free-fallback rule.
- **Studio lower-third grammar everywhere.** Onboard lines, beat panels, claim cards and the arcade result all use the Live banner form: pulsing dot + uppercase kicker, ALL-CAPS headline (≤36 effective), one line of text, then a `LIVE with [Guest], [Role] of [Company]` name card.
- **70s/80s/90s New York on the street.** Theater marquees with chasing bulbs over every door, a 3x3 bank of CRT monitors in a shop window playing the pre-roll (two on static), a newsstand and pasted broadsheet posters that carry the real guest quotes, a running news ticker across both rows in the on-air ticker's category grammar, a subway entrance with chartreuse globe lamps for Rails Station, a payphone, hydrants, newspaper boxes, a parked town car, a lit skyline ring, wet asphalt under ivory lamps, film grain over the whole frame.
- **Teach-before-you-enter windows.** Each ground-floor window is a board: the Stablecoin Shop price board (`$1.000 · PEG HELD`), the Rails departure board (ACH Mon 9:00 · Cards now 2.9% · USDC now T+0), the Policy Desk rules, the Arcade's "3 RAILS · 1 SETTLEMENT".
- **Arcade teaches with a tally.** Every hit flashes what it cost (card hold skims 2.9%, ACH lands next business day, depeg, compliance pause) and the result card totals clears, holds and card fees on a $1,000 send.
- **Onboard runs on the wall clock** (it used to stall when the tab throttled frames). Fonts are awaited before any canvas sign is drawn, so marquees and posters render in Aspekta, not a fallback.
- Claims: still 31 rows, 4 `verified: true`. Nothing invented. Posters and the ticker read from `public/claims.json` at runtime; unverified rows carry "positioning, confirm on air".

## Experience lock (product canon)

**Value:** feel how modern money moves in under a minute, taught by real Live guests.
**Fantasy:** citizen on the block on a Live night. Shops are topics, not menus.
**Loop:** arrive (~8s thesis) → pick a door → 20–40s playable beat → earn the cited punchline + episode link → share Settlement Run ghost time.

| Door | Teaches (mechanic first) | Rewards (cite after) | Outcome |
| --- | --- | --- | --- |
| Stablecoin Shop | Peg-keep: defend $1.00 through 3 redemption waves | Guest line + episode link | 24/7 dollars vs bank hours |
| Rails Station | Play ACH, cards, **and** USDC for Sat 2am | Guest line + episode link | Cards vs rails vs onchain |
| Policy Desk | Send without sim → no undo; reset; simulate; send | Guest line + episode link | Settlement can fail / sim-undo |
| Agent Pay Arcade | Corridor run starts immediately. 8s trailer. **No claim on the HUD** | Punchline + fee tally + ghost share after settle | Agent-pay corridor |

Cut: quote museums, empty voids, storefront → text wall with no mechanic.

## Brand lock

Tokens only: base black `#11100e`, neutral-900 `#1b1b18`, neutral-800 `#31302b`, neutral-700 `#41403a`, ivory `#f5f5f7`, gray `#a7a5a0`, smoke `#8b8b9e`, broadcast chartreuse `#d0ea66` (one accent, punctuation only: marquee-on, practicals, LIVE tag, verified badge, CTA). No amber, no purple fog, no CRT scanline shader, no second palette. The MoveMe sting is the one exception and it is the show's own asset.

## Phone play

1. Open the Railway URL in Safari or Chrome. Add to Home Screen for full-bleed.
2. **Enter the district.** Watch the 8-second walk or tap **Skip intro**.
3. Left stick to walk. Drag on the street to look. Tap a lit marquee, or the **Enter** prompt when it appears.
4. Do the beat with thumbs: tap Defend on redemption waves, tap all three rail cards, Simulate then Send, or tap left/right halves in the arcade.
5. Read the name card and the one guest line. **Watch the episode ↗** leaves the game.
6. Arcade: stay on **USDC**, dodge **DEPEG / COMPLIANCE**. Your best time is a ghost on this phone only. **Copy time** copies a share line with the `?door=arcade` deep link.

Landscape is nicer for the run; portrait is fine for the street and the shop beats.

## Controls

| Input | Street | Arcade |
| --- | --- | --- |
| `W A S D` / arrows | Walk | `A D` / `← →` change rail |
| Mouse (click to lock) | Look | — |
| Drag (touch or mouse) | Look | Tap/swipe left or right half to change rail |
| Left virtual stick | Walk (touch) | — |
| `E` / tap prompt / tap marquee | Play the beat | — |
| `Esc` | Back to street | Abort to street |

## Run locally

```bash
npm i
npm run dev
```

```bash
npm run build
npx serve dist -l 8766
```

`npm run build` typechecks, then writes static `dist/`. Deep links: `?door=arcade` | `stablecoin` | `rails` | `policy` after **Enter**.

## Claims

Loader accepts dual field names (`storefront`/`storefrontId`, `quote`/`claim`, `guest`/`guestName`, `episode`/`episodeTitle`, `videoUrl`/`episodeUrl`). `verified: false` is never shown as on-air tape. New Live night → new rows in the same `claims.json`; the street does not change, the posters and ticker do.

## Deploy (static)

`dist/` is the site. Relative `base: './'`. No API, no secrets. Railway service `modern-money-district / web` builds with `npm run build` and serves `dist` with `serve` on `$PORT` (`railway.toml`).

## Assets and provenance

| File | Source |
| --- | --- |
| `public/media/live-intro.mp4` | `content-ops/04-knowledge/assets/stream-graphics/Intro - Stabledash - VFinal.mp4`, 960x540, muted |
| `public/media/moveme.mp4` | `…/stream-graphics/transitions/Generic MoveMe Transition.mp4`, 960x540, muted |
| `public/brand/live-logo.png` | `…/assets/logos/stabledash-logos-brand/Stabledash Live Logo.png` |
| `public/brand/wordmark-white.png`, `s-mark.png` | `…/assets/logos/` |
| `public/fonts/Aspekta-*.woff2` | `…/assets/fonts/Aspekta/` |
