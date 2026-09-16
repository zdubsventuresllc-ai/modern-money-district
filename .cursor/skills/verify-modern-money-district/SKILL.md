---
name: verify-modern-money-district
description: Drive the Modern Money District web UI (Late Friday cabinet + 3D district) the way a user does — launch, doctor, click/keyboard, and capture proof. Use when proving UI behavior, checking a change against the experience lock, or before claiming a feature works.
---

# Verify Modern Money District

Project-local verification skill. You are driving a **browser web UI**, not an API product. Write proof for the next agent, not a demo reel.

This repo is a lab spike. **Verification scaffolding only.** Do not edit brand tokens, claim copy, `verified` flags, Railway/Pages deploy config, or product UX while running this skill. Do not invent `verified: true`.

## Surfaces (interview, not guesses)

| Surface | URL | What the user touches | Source |
| --- | --- | --- | --- |
| **Primary — Late Friday** | `/` (`index.html`) | 2D Frogger cabinet. Attract → PRESS START → hop. | `src/game/game.ts` |
| **Secondary — 3D district** | `/district.html` | Splash → 8s onboard → WASD street → door beat or Settlement Run. | `src/main.ts` |
| Claims feed | `/claims.json` | Static JSON from `public/claims.json`. No `data/claims.json` in this tree. | `src/claims.ts` |

There is no CLI product, no auth, no API, no secrets. `npm run build` writes static `dist/`.

**Experience lock:** arrive → door → 20–40s playable beat → earn a cited claim → share. Arcade is play-first (no claim on the HUD), punchline after settle.

## Launch

One isolated instance per verify home. Default home is `/tmp/mmd-verify`. Override with `MMD_VERIFY_HOME` **and** a free `--port` if another run already holds the lock.

From the repo root, after `npm i`:

```bash
.cursor/skills/verify-modern-money-district/helpers/control-mmd launch --port 55173 --mode dev
```

That runs the repo's documented command:

```bash
npm run dev -- --host 127.0.0.1 --port 55173 --strictPort
```

Ready when `GET http://127.0.0.1:55173/` returns HTTP 200 and the HTML contains `PRESS START`. The helper waits up to 30s and writes `/tmp/mmd-verify/instance.json`.

**Preview (frozen build)** — use when you need the production bundle, not HMR:

```bash
npm run build
.cursor/skills/verify-modern-money-district/helpers/control-mmd launch --port 55173 --mode preview
```

That is `npm run preview -- --host 127.0.0.1 --port 55173 --strictPort` (Vite preview default in `vite.config.ts` is 4173; this skill never uses that port unless this run created the instance).

**Do not** attach to a human's `5173` / `4173` / Railway tab. If `instance.json` is missing or the recorded PID is dead, refuse and launch. If the port is already bound by a PID this run did not start, refuse — do not steal it.

Teardown is **Cleanup**, not `pkill vite`.

## Doctor

Read-only. Run before the first drive, after any failed drive, and whenever the UI looks off.

```bash
.cursor/skills/verify-modern-money-district/helpers/control-mmd doctor
```

Doctor is green only when all of these hold:

1. `/tmp/mmd-verify/instance.json` exists (or `$MMD_VERIFY_HOME/instance.json`).
2. The recorded PID is alive and is an ancestor of the listener on the recorded port.
3. `GET /` → 200, body includes `LATE FRIDAY` and `PRESS START`.
4. `GET /district.html` → 200, body includes `Enter the district` and `id="enter-btn"`.
5. `GET /claims.json` → 200 JSON with `meta.title` and a `claims` array. Report the file's own `verified: true` count. Never flip a flag.

If doctor fails, cleanup residue from *this* home, relaunch, doctor again. Do not drive a red instance.

## Drive

Harness: `control-mmd` (Playwright over Chrome CDP). Prefer the stable handles below — never click canvas pixels or use `window.__lateFriday` to mutate game state. That object exists on Late Friday for debugging; using it is not a user path.

Start a browser **after** doctor is green. Each `browser start` uses a fresh Chrome profile (empty `localStorage`), so onboard and hi-scores are first-visit.

```bash
.cursor/skills/verify-modern-money-district/helpers/control-mmd browser start
.cursor/skills/verify-modern-money-district/helpers/control-mmd browser goto --path /
```

Composable actions (see **Helpers** for flags):

```bash
control-mmd browser click --selector "#start"
control-mmd browser click --role button --name "PRESS START"
control-mmd browser click --role button --name "Enter the district"
control-mmd browser press --key ArrowUp
control-mmd browser wait --selector "#attract" --state hidden
control-mmd browser expect --selector "#hud-clock" --text "FRI"
control-mmd browser screenshot --path "$EVIDENCE/play.png"
control-mmd browser snapshot --path "$EVIDENCE/play.aria.txt"
```

### Stable handles (from this repo)

**Late Friday (`/`)**

| Handle | Role |
| --- | --- |
| `#start` | `PRESS START` — attract → play |
| `#sound` | Sound off/on (`aria-pressed`) |
| `#attract` `#clear` `#over` | Overlays; hidden via class `hidden` |
| `#hud-clock` `#hud-amount` `#hud-lives` `#hud-score` `#hud-level` | Play HUD |
| `#pad [data-dir=up\|left\|down\|right]` | On-screen hop (also `aria-label` Up/Left/Down/Right) |
| `#clear-next` `#clear-watch` `#clear-quote` `#clear-verify` | Level-clear guest line |
| `#again` `#share` `#save-score` `#receipt` | Game-over receipt |
| Keys | Attract: Enter / Space / WASD / arrows start. Play: WASD / arrows hop. |

**3D district (`/district.html`)**

| Handle | Role |
| --- | --- |
| `#enter-btn` | Splash CTA. Disabled + `Loading the block…` until boot finishes, then `Enter the district`. |
| `#onboard-skip` | Skip the 8.6s intro (`Skip intro`) |
| `#hud` `#prompt` `#prompt-label` `#nearest` | Street HUD |
| `#beat` `#beat-title` `#beat-stage` `#beat-status` `#beat-back` | Storefront beat dialog |
| `[data-act=defend]` | Stablecoin Shop — Defend with reserves |
| `[data-act=ach\|cards\|usdc]` | Rails Station — all three required |
| `[data-act=sim\|send\|reset]` | Policy Desk — simulate before send |
| `#claim` `#claim-text` `#claim-guest` `#claim-verify` `#claim-back` `#claim-episode-link` | Cited punchline |
| `#arcade-hud` `#arcade-clock` `#arcade-coach` `#arcade-lanes [data-lane]` `#arcade-exit` `#countdown` | Settlement Run HUD |
| `#arcade-result` `#result-title` `#result-time` `#result-claim` `#result-copy` `#result-again` `#result-street` | After settle / DNF |
| Deep links | `?door=arcade` `?door=stablecoin` `?door=rails` `?door=policy` (aliases: `agent-pay-arcade`, `stablecoin-shop`, `rails-station`, `policy-desk`). Applied **only after** Enter. |

Keyboard on the street: `W A S D` walk, `E` enter nearest door, `Esc` back. Arcade: `A` / `D` (or arrows) change rail. Pointer lock is desktop-only and **not required** — deep links + buttons are the agent path.

Read the feature map before driving. A proof that only hits `/` is incomplete if the change touched a district door.

## Evidence

Named location (survives cleanup):

```
.cursor/skills/verify-modern-money-district/evidence/<run-id>/
```

```bash
EVIDENCE=$(.cursor/skills/verify-modern-money-district/helpers/control-mmd evidence-init --id <run-id>)
```

Proof standards:

- Exercise the **real user path** (button, pad, key, deep link + Enter). No internal setters, no `__lateFriday.start()`, no editing `claims.json` to force a badge.
- Capture the **action and the resulting state**, not only the last frame. Attract screenshot + post-START HUD is a Late Friday proof; splash + street HUD is a district proof.
- Side effects to observe: overlay `hidden` class, HUD text, `#claim-verify` / `#clear-verify` matching the **file's** `verified` boolean, `localStorage` keys only inside the isolated Chrome profile (`mm-late-friday-hiscores-v1`, `mmd-onboard-v2`, `mmd-arcade-ghost-v2`).
- Claims: assert the badge string the UI already chose (`On-air tape · verified` vs `Positioning · confirm on air`). Do not mint tape.
- Mocks: none. This app has no production network boundary except static YouTube links on "Watch the episode ↗". Do not click those for a local proof (leaves the app).
- Every artifact records the feature ID and entry point in `evidence/<run-id>/meta.json` (the helper writes this when you pass `--feature` / `--entry`).

Minimum Late Friday proof set: `attract.png`, `play.png`, `play.aria.txt`, `doctor.json`, `meta.json`.

## Cleanup

```bash
.cursor/skills/verify-modern-money-district/helpers/control-mmd cleanup
```

Kills **only** the PIDs recorded in this verify home (Vite process group + Chrome process group). Removes `instance.json`, `browser.json`, Vite log, and the Chrome user-data dir.

Never `pkill -f vite`, never kill by window title. Never delete `evidence/`. After cleanup, confirm the evidence directory still has the files you wrote.

If a drive fails, run cleanup for this home before the next launch so ports and CDP sockets are not stranded.

## Helpers

Install once per machine (verification scaffolding, not an app dependency):

```bash
npm install --prefix .cursor/skills/verify-modern-money-district/helpers
```

`control-mmd` is executable. Invoke it from the repo root as shown. Subcommands:

| Command | What it does |
| --- | --- |
| `launch [--port 55173] [--mode dev\|preview] [--bind 127.0.0.1]` | Start Vite; wait until `/` is 200; write `instance.json`. Refuses if this home already has a live instance or the port is foreign. |
| `doctor` | Read-only health JSON on stdout; exit 0 only if green. |
| `browser start [--cdp-port 55174]` | Detached system Chrome with CDP; fresh profile; connect Playwright; open one page at the instance URL. |
| `browser goto --path /` | `page.goto` on the instance origin + path. |
| `browser click --selector CSS` or `--role ROLE --name NAME` | Click. Role+name uses getByRole. |
| `browser press --key ArrowUp` | Keyboard on the page. |
| `browser wait --selector CSS --state visible\|hidden [--timeout 15000]` | Playwright visibility, treating `.hidden` as hidden. |
| `browser expect --selector CSS [--text SUB] [--state visible\|hidden]` | Assert or exit 1. |
| `browser text --selector CSS` | Print `innerText`. |
| `browser snapshot --path FILE` | ARIA/accessibility dump. |
| `browser screenshot --path FILE` | PNG. |
| `browser json --url /claims.json` | Fetch from the instance; print JSON. |
| `evidence-init [--id RUN]` | Create the evidence dir; print its absolute path. |
| `cleanup` | Tear down PIDs and scratch this home created. Leaves evidence. |

Chrome binary: `$CHROME_PATH`, else `/usr/local/bin/google-chrome`, else `/usr/bin/google-chrome-stable`. Playwright uses `connectOverCDP` — it does not download a browser.

## Feature map

Maintained source: [`features/README.md`](features/README.md). Drive from those recipes.

## Maintenance

When the app changes, run `/maintain-verification-skill` so the map stays honest. Do not guess cadence.
