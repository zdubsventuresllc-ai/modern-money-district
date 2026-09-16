# Settlement Run

Agent Pay Arcade is a corridor run: three rails (ACH, Cards, USDC), play starts immediately, an 8s trailer, and **no claim on the HUD**. The guest line and fee tally appear only after settle or window-closed.

## Sub-features

- `arcade-enter` starts the run from the arcade door or `?door=arcade` after Enter.
- `arcade-hud` shows Settlement Run, `T+` clock, ghost line, and ACH / Cards / USDC with USDC hot by default.
- `arcade-play-first` — `#arcade-coach` / clock only; `#result-claim` and the claim sheet are hidden while running.
- `arcade-shift` changes rail with `A` / `D`, arrows, or left/right half taps.
- `arcade-exit` aborts to the street via **Exit** or Esc (DNF, no forced claim).
- `arcade-result` after settle (`SETTLED T+0`) or timeout (`WINDOW CLOSED`) shows tally + guest line.

## How to get to it (user POV)

- On the street, enter **Agent Pay Arcade** (`E` / tap).
- Deep link `/district.html?door=arcade` or `?door=agent-pay-arcade`, then **Enter the district**.
- From a result sheet: **Run again**.

## Driving it with control-mmd

Preconditions:

- Doctor is green.
- Fresh browser session.
- Path `/district.html?door=arcade`.

- **Enter the corridor.** Wait for `#enter-btn` → `Enter the district`. Click it. After the sting, `#arcade-hud` is visible. `#arcade-clock` matches `T+`. `#countdown` may show `3` during countdown; coach reads `Three rails. One settlement.`
- **Play-first check.** While `#arcade-hud` is visible, `#arcade-result` and `#claim` are hidden. There is no guest quote on the HUD. `#arcade-lanes [data-lane="2"]` has `is-hot` (USDC). Screenshot `$EVIDENCE/arcade-hud.png`.
- **Change rail.** Run `control-mmd browser press --key KeyA`. The hot lane moves toward ACH (`data-lane="1"` or `"0"`). `KeyD` moves back toward USDC.
- **Abort (safe proof).** Run `control-mmd browser click --selector "#arcade-exit"`. Mode returns to the street (`#hud` visible, `#arcade-hud` hidden). This proves enter + play-first + exit without needing a 55s clear.
- **Full settle (optional, long).** Stay on USDC, dodge DEPEG / COMPLIANCE. A win opens `#arcade-result` with `#result-title` `SETTLED T+0` and a time. A timeout shows `WINDOW CLOSED`. Only then may `#result-claim` show a quote. Do not call this verified if you only aborted.
- **Proof (baseline).** `arcade-hud.png` + snapshot showing Settlement Run, `T+`, three rails, no quote. Meta `feature=settlement-run` `entry=door-arcade`. If you aborted, record `arcade-exit` as the end state, not `SETTLED`.

## Gotchas

- Play-first is the product lock. A HUD that shows the guest line before settle is a regression — fail the proof.
- Countdown + 8s trailer are real time. Do not assert the running coach (`Dodge depeg…`) during countdown.
- Completing the corridor is timing-heavy and WebGL-heavy. The required proof for this map entry is HUD + play-first + a rail shift or exit. Mark full settle separately if you did not finish.
- Ghost text is `No ghost yet` on a fresh profile, or `Ghost mm:ss.s` if `mmd-arcade-ghost-v2` exists.
- `#result-copy` writes a share line with `?door=arcade`. That is cited-claim-share, after a result sheet exists.
