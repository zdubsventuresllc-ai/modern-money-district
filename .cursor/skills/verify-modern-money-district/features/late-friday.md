# Late Friday cabinet

Late Friday is the front-door arcade: a Frogger-style cabinet where the user is $1,000 trying to reach Singapore vendors. Attract explains the joke; PRESS START starts a playable hop on the payment grid; death and settle copy is payments language, not a score chase.

## Sub-features

- `lf-attract` shows the LATE FRIDAY attract sheet with PRESS START and the hi-score list.
- `lf-start` leaves attract and reveals the play HUD (clock, payment, lives).
- `lf-hop` moves one tile via pad, WASD/arrows, or a board swipe.
- `lf-card-tax` charges 2.9% when the first hop enters a card lane.
- `lf-sound` toggles Sound off / Sound on without starting a run.

## How to get to it (user POV)

- Open `/` (the site root). This is the default page.
- Click **PRESS START**, or press Enter / Space / any WASD or arrow key on attract.
- On phone: tap PRESS START, then the direction pad or the board.

## Driving it with control-mmd

Preconditions:

- Doctor is green at `http://127.0.0.1:55173`.
- Browser session is on `/`.
- `#attract` is visible and `#start` reads `PRESS START`.
- Do not call `window.__lateFriday.start()`.

- **Confirm attract.** Read the sheet. Run `control-mmd browser expect --selector "#start" --text "PRESS START" --state visible` and `control-mmd browser screenshot --path "$EVIDENCE/attract.png" --feature late-friday --entry attract`. The PNG shows LATE FRIDAY and PRESS START.
- **Start a run.** Choose PRESS START. Run `control-mmd browser click --role button --name "PRESS START"`. `#attract` becomes hidden; `#hud-amount` reads `$1,000.00`; `#hud-lives` contains `$`; `#hud-clock` contains `FRI`.
- **Assert play HUD.** Run `control-mmd browser wait --selector "#attract" --state hidden` then `control-mmd browser expect --selector "#hud-amount" --text '$1,000.00'` (single quotes — a double-quoted `$1,000.00` is eaten by the shell). Clock may already have ticked off `4:55` — assert `FRI`, not a frozen minute.
- **Hop.** Press up. Run `control-mmd browser press --key ArrowUp`. The canvas stays visible. A hop into the first card lane taxes the payment (`$1,000.00` → `$971.00`) and may also flash `INTERCHANGE` or `DECLINED · DO NOT HONOR` if a taxi hits. Either HUD change or toast is the hop proof. Pad equivalent: `control-mmd browser click --selector "#pad [data-dir=up]"`.
- **Sound (optional).** Run `control-mmd browser click --selector "#sound"`. The button text becomes `Sound on` and `aria-pressed` is `true`. Toggle back if you need silence.
- **Proof.** Run `control-mmd browser screenshot --path "$EVIDENCE/play.png" --feature late-friday --entry press-start` and `control-mmd browser snapshot --path "$EVIDENCE/play.aria.txt"`. Artifacts show the play HUD (Clock / Payment / Lives) and no PRESS START overlay.

## Gotchas

- Attract also starts on Enter, Space, or a direction key. Do not press those while still asserting attract.
- The attract clock idles forward. Do not require `FRI 4:55 PM` after more than a second on the page — require `FRI` and `$1,000.00` at start.
- `#gl` is a 2D canvas. Pixel-clicking the board is legal for a user but unstable for agents; use `#pad` or keys.
- `window.__lateFriday` is not a user control. A proof that only sets `phase = "play"` is invalid.
- Completing five storefronts (level clear + guest line) is a long play. Do not require a full clear for `lf-start` / `lf-hop`.
- Sound is off by default. Enabling it is not required for proof.
- Quote dollar amounts with single quotes (`--text '$1,000.00'`). Double quotes expand `$1`.
