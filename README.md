# Late Friday · Modern Money District

Stabledash Live's arcade. **Late Friday** is the main game: a Frogger-style cabinet where you are $1,000 trying to reach a vendor in Singapore at 4:55 PM on a Friday, and every lane is a payment rail. The earlier walkable 3D block still lives at `/district.html`.

**Play:** https://web-production-6efce.up.railway.app/ (hard-refresh after a deploy)

## What changed in this pass (2026-09-08, the 8-bit pivot)

Zach's read on the 3D block: the mouse got stuck (pointer lock) and the world asked a lot before it paid anything back. So the front door is now an 80s cabinet, no 3D, no pointer lock, 22 KB of JavaScript.

- **Late Friday** (`index.html`, `src/game/`). 13x15 pixel grid on a 2D canvas, Press Start 2P for game text, Aspekta for the chrome, brand tokens only. Arrows / WASD, swipe, tap the board, or the on-screen pad. Never captures the pointer.
- **The board is the payment stack.** Bottom to top: PAYER · NYC → two card lanes (taxis marked DECLINE; stepping in costs 2.9% interchange) → KYC desk → the ACH river (four rows of BATCH barges that only move during bank hours) with the **lime USDC express bridge** on the right (open 24/7, T+0, a drifting `.97` depeg puddle rides it) → FX desk → SWIFT lane (CORR vans bounce you back to the FX desk and take $25) → CHECK ADDR row (`0x?` manholes: step on one and the payment is gone, no undo) → KYC gate (opens and closes) → VENDOR · SG → five storefronts to pay.
- **The clock is the joke.** Starts FRI 4:55 PM, one game minute per real second. At 5:00 PM the barges freeze ("ACH BATCH WINDOW CLOSED"). Stand on a frozen barge and the clock fast-forwards through the weekend until MON 9:00 AM. The bridge never closes.
- **Score = amount arrived + time bonus + level bonus.** Waiting the weekend wipes the bonus. Three lives, hi-score table with initials in `localStorage`.
- **Each level clear pays a guest line** from `claims.json` in the Studio lower-third grammar (level 1 rails, 2 stablecoin, 3 policy, 4 agents, then cycles; verified rows first, unverified badged as positioning).
- **The settlement receipt is the share unit.** Game over prints a paper receipt: payments settled, amount arrived, card interchange, correspondent fees, depeg slippage, time waiting on ACH, payments lost, score, and one line that tells you what the run taught you. Share uses the Web Share API where available, otherwise copies text; the on-screen CTA is "screenshot and tag @stabledash".
- **Sound** is an 8-bit WebAudio synth (hop, fee, bounce, death, settle, level jingle), off by default, one tap to enable.
- The real Live pre-roll plays muted behind the attract screen. Film grain stays.
- Vite is now multi-page: `index.html` (arcade) + `district.html` (the 3D block, unchanged from the 2026-09-07 pass, still deep-linkable with `?door=`).

### Phone play (Late Friday)

1. Open the URL. Add to Home Screen if you want it full-bleed.
2. Tap **PRESS START**. Tap the pad, swipe, or tap the board on the side you want to hop.
3. Get across the card lanes between taxis (each lane costs 2.9%). Cross the river on ACH barges while banks are open, or take the lime bridge on the right any time. Dodge the `.97` puddle.
4. Get past the SWIFT vans, read the address row, wait for the gate, and step into a storefront. Five storefronts clear the level.
5. Read the guest line. Play on. When you're out of lives, screenshot the receipt.

### Design notes

- Rails are choices, not layers: the bridge exists so "the stablecoin rail never closes" is something you *do*, not something you read.
- Death copy is the payments world's own language: DECLINED · DO NOT HONOR, ACH RETURN · R01, SENT TO 0x000…DEAD · NO UNDO, CORRESPONDENT BANK -$25.
- No scanline or CRT shader. Pixel grid, brand palette, film grain, ivory paper receipt.

## The 3D block (`/district.html`)

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
