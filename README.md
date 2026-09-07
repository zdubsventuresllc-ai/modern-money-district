# Modern Money District

Stabledash lab spike: a **small walkable Three.js city block** (not an open world) and an **Agent Pay Arcade** settlement-run. Overnight playable prototype. Terminal / data-brutalism. Amber on black.

Claims in `public/claims.json` are grounded in **Stabledash Live Ep 56** (2026-09-03) plus the 8/20 Tenderly extract. Quotes are not rewritten. Prefer `verified: true` in the UI; `verified: false` is never presented as tape and is badged **product framing / confirm on-air**.

## What shipped

- First-person street with four storefronts:
  1. **Stablecoin Shop** — peg / reserves
  2. **Rails Station** — ACH / cards / USDC
  3. **Policy Desk**
  4. **Agent Pay Arcade**
- Walk up to a door → attributed “Guest said…” beat + episode link-out (optional clip link-out). No video embeds.
- Arcade: **Settlement Run** — three-rail racer, hazards vs clears, finish gate, under 60s, ghost best time in `localStorage`.
- In-game controls overlay on street and in arcade.
- Static Vite build. No API. No secrets.

## Controls

| Input | Street | Arcade |
| --- | --- | --- |
| `W A S D` / arrows | Walk | `A D` / `← →` change rail |
| Mouse (click to lock) | Look | — |
| Drag / right-side touch | Look (coarse pointer) | Tap/swipe left or right half to change rail |
| Left virtual stick | Walk (touch) | — |
| `E` / tap prompt / click door | Enter storefront | — |
| `Esc` | Release look / back | Abort to street |
| On-screen **EXIT TO STREET** | — | Leave the run |

## Run locally

```bash
npm i
npm run dev
```

Open the printed localhost URL. Click **ENTER THE BLOCK**.

```bash
npm run build
npm run preview
```

`npm run build` typechecks, then writes a static site to `dist/`.

## Claims schema

Loader accepts dual field names (`storefront` ↔ `storefrontId`, `guest` ↔ `guestName`, `quote` ↔ `claim`, `episode` ↔ `episodeTitle`, `videoUrl` ↔ `episodeUrl`). Canonical file on this branch uses Content Ops names. `verified: false` is never shown as on-air tape — hidden from the arcade strip and badged **product framing / confirm on-air** if paged to.

```json
{
  "meta": {
    "title": "Modern Money District",
    "sourceNote": "…",
    "episodeYoutube": "https://www.youtube.com/watch?v=YHFAFX757a0"
  },
  "claims": [
    {
      "id": "amias-24-7",
      "storefront": "stablecoin",
      "guest": "Amias Gerety",
      "company": "QED Investors",
      "role": "Partner, Head of U.S.",
      "quote": "…",
      "episode": "Stabledash Live Ep 56",
      "date": "2026-09-03",
      "videoUrl": "https://www.youtube.com/watch?v=YHFAFX757a0",
      "verified": true
    }
  ]
}
```

`storefront` map: `stablecoin` → Stablecoin Shop, `rails` → Rails Station, `policy` → Policy Desk, `arcade` → Agent Pay Arcade. Episode links are YouTube link-outs.

## Deploy (static)

The site is the `dist/` folder. Relative `base: './'` so it works at a domain root or a subpath.

### Live public URL (Railway)

**https://web-production-6efce.up.railway.app/**

Static `dist/` served from this branch. GitHub Pages could not be flipped on from the agent token (private repo, Pages API 403). The Actions workflow is still in `.github/workflows/pages.yml`.

### GitHub Pages (Actions)

Workflow: `.github/workflows/pages.yml` (build `dist/`, upload Pages artifact).

One-time in the repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Merge to `main` (or run the workflow with **workflow_dispatch**)
3. Public URL after the first successful deploy:

`https://zdubsventuresllc-ai.github.io/modern-money-district/`

Private repos need Pages enabled for the org/plan. If Pages stays off, use the Railway URL above.

### Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Node: `20`

### Vercel

- Framework preset: Vite
- Build command: `npm run build`
- Output: `dist`

### Any static host

```bash
npm i
npm run build
```

Upload `dist/`.

Ghost times stay in the visitor’s `localStorage` (`mmd-arcade-ghost-v1`). Nothing is posted to a server.

## Brand notes

- Cream / amber type on ink. Navy volumes. No purple fog, no cartoon crypto, no generated anchor faces.
- Copy pattern: **Guest said…** + claim + episode cite.
- Stabledash street, not a generic Fable dump.
