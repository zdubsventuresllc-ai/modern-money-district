# Modern Money District

Stabledash Live lab spike: a **walkable Three.js city block** and an **Agent Pay Arcade** settlement run. You feel how modern money moves in under a minute, taught by real Live guests — not a quote museum.

Brand is the Stabledash Live freeze-frame: midnight `#11100e` / charcoal `#1a1c17` / ivory `#f5f5f7` / gray `#a7a5a0` / smoke `#8b8b9e` / lime `#d0ea66`. Instrument Serif display + Aspekta (Outfit fallback) UI. Full-bleed cinematic street — not amber terminal, not a quote museum.

Claims in `public/claims.json` stay denser (~31 rows, 4 `verified: true`). `verified: true` only for Whisper / Ovitz tape. Never invented. Dual keys (`storefront` / `storefrontId`, etc.) still load.

## Loop

**Arrive → pick a door → 20–40s playable beat → earn the cited punchline → share the ghost.**

1. Title sheet (Stabledash Live energy) → ~8s first-run hook on the street.
2. Four doors. Each **teaches by doing**, then unlocks one attributed claim:
   - **Stablecoin Shop** — peg-keep: defend $1.00 through redemption waves.
   - **Rails Station** — pick/compare ACH vs cards vs USDC.
   - **Policy Desk** — send without a sim (no undo) vs simulate first.
   - **Agent Pay Arcade** — Settlement Run starts immediately. First 8 seconds are the trailer (lane names, depeg / compliance, USDC clear). **No guest claim until you settle.** Ghost in `localStorage`.
3. Punchline is **Guest said…** + episode cite. Verified-tape badge only when `verified: true`. Optional YouTube **link-out**, no embeds.

New Live night → new claims in the same block. The street does not change.

## What changed in this pass

- Design Expert canon: charcoal storefront mass, midnight roofs, gray trim, ivory glass ~10%, one lime practical per door (thin fixture + sign-on). Ivory-tinted key, charcoal fill, midnight ambient 0.22, cool charcoal haze. Splash matches the Live site (12PM ET, site lede, 250+ / 10M+ / 10,000+). Sparse one-card HUD. No lime wash, no amber, no second palette.
- First-run onboard (~8s). Skip + reduced-motion skip. Remembered in `localStorage` (`mmd-onboard-v1`).
- Teach-then-reward storefronts. Claim panels no longer open cold.
- Arcade trailer polish + punchline on the result sheet (copy time to share).
- Phone HUD: virtual stick, tap-to-enter, large beat buttons. Desktop controls stay on the left.

## Phone play

1. Open the Railway / preview URL in Safari or Chrome.
2. Add to Home Screen if you want full-bleed.
3. **Enter the district.** Watch the hook or tap Skip.
4. Left stick to walk. Tap a glowing door (or the **Play …** prompt).
5. Do the beat with thumbs — clock tap, rail cards, simulate/send, or swipe halves in the arcade.
6. Read the one guest line. **Watch episode ↗** leaves the game.
7. Arcade: stay on **USDC**, dodge **depeg / compliance**. Best time is a ghost on *this* phone only.

Landscape is nicer for the run; portrait is fine for the street and shop beats.

## Controls

| Input | Street | Arcade |
| --- | --- | --- |
| `W A S D` / arrows | Walk | `A D` / `← →` change rail |
| Mouse (click to lock) | Look | — |
| Drag / right-side touch | Look | Tap/swipe left or right half to change rail |
| Left virtual stick | Walk (touch) | — |
| `E` / tap prompt / tap door | Play the beat | — |
| `Esc` | Back | Abort to street |

## Run locally

```bash
npm i
npm run dev
```

```bash
npm run build
npm run preview
```

`npm run build` typechecks, then writes static `dist/`. `npm run preview` serves `dist/` on port **8766**.

## Claims

Loader still accepts dual field names. `verified: false` is never shown as on-air tape — badged **product framing / confirm on-air**. Arcade HUD does not treat unverified rows as tape.

`storefront` map: `stablecoin` → Stablecoin Shop, `rails` → Rails Station, `policy` → Policy Desk, `arcade` → Agent Pay Arcade.

## Deploy (static)

The site is `dist/`. Relative `base: './'`. No API. No secrets.

### Live public URL (Railway)

**https://web-production-6efce.up.railway.app/**

Static `dist/` from this lineage. `railway.toml` builds with Nixpacks and serves `dist` on `$PORT`.

```bash
npm i
npm run build
```

Upload `dist/` to any static host (Cloudflare Pages output `dist`, Vercel Vite preset, etc.).

Ghost times stay in `localStorage` (`mmd-arcade-ghost-v1`).

## Brand notes

- Midnight street, ivory type, lime accent (active only). Serif for titles, sans for UI.
- Full-bleed. No cream/amber mono terminal. No purple fog. No generated faces.
- Copy pattern after a beat: **You felt it** → one lesson → **Guest said…** → episode cite.
- Stabledash Live night, not a generic Fable dump.
