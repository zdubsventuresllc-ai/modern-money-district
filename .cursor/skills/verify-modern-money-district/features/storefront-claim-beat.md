# Storefront claim beat

Each lit door (except the arcade) is a short playable beat, then a cited guest line. The user feels the mechanic first; the punchline and episode link come after. Unverified rows are badged positioning, never on-air tape.

## Sub-features

- `beat-stablecoin` — peg-keep: defend $1.00 through three redemption waves (`[data-act=defend]`).
- `beat-rails` — play ACH, Cards, **and** USDC (`[data-act=ach|cards|usdc]`). All three required.
- `beat-policy` — send without sim → no undo; reset; simulate; send (`[data-act=send|reset|sim]`).
- `beat-claim` — claim sheet with guest, quote, verify badge, Watch the episode ↗.
- `beat-back` — Back to street from the beat or the claim.

## How to get to it (user POV)

- Walk to a lit marquee on the street and press `E`, tap the Enter prompt, or tap the marquee.
- Deep-link after splash: `/district.html?door=stablecoin` | `rails` | `policy` (aliases `stablecoin-shop`, `rails-station`, `policy-desk`), then **Enter the district**.
- Late Friday level-clear guest lines are a different surface (see cited-claim-share). This feature is the 3D door loop.

## Driving it with control-mmd

Preconditions:

- Doctor is green.
- Fresh browser session.
- Prefer the rails deep link for a first proof: no wave timer.

- **Open Rails Station via deep link.** Run `control-mmd browser goto --path "/district.html?door=rails"` then wait for `#enter-btn` to read `Enter the district`. Click it. After the ~1s MoveMe sting, `#beat` is visible and `#beat-title` reads `ACH WAITS. CARDS TAX. USDC CLEARS`.
- **Play all three rails.** Run `control-mmd browser click --selector "[data-act=ach]"`, then `[data-act=cards]`, then `[data-act=usdc]`. `#beat-status` updates after each (`Batch window closed` / `$29` / `T+0`). After the third, status becomes the rails lesson and the claim sheet opens (~700ms).
- **Read the claim.** Run `control-mmd browser wait --selector "#claim" --state visible --timeout 5000`. `#claim-text` is a quoted line. `#claim-verify` is either `On-air tape · verified` or `Positioning · confirm on air`. Cross-check `/claims.json` rows with `"storefront": "rails"` — the UI picks a `verified: true` row if one exists (Amias / Bank of America is tape in the current file). Do not change the file.
- **Policy path (optional second entry).** `?door=policy`. On the beat, click **Send** first → status `No undo button. Reset and simulate.` Then **Reset**, **Simulate**, **Send**. Claim title `ONCHAIN HAS NO RECALL DESK`.
- **Stablecoin path (optional).** `?door=stablecoin`. Wait until `#beat-status` reads `Redemption wave. The peg slipped.` then click **Defend with reserves** until status shows `3/3` and the claim opens. Clicking Defend before a wave only firms the peg.
- **Proof.** Screenshots: `$EVIDENCE/beat.png` (rails cards visible) and `$EVIDENCE/claim.png` (quote + badge). Snapshot the claim sheet. Meta records `feature=storefront-claim-beat` and the door used.

## Gotchas

- The sting (`#sting`) lasts ~1s after Enter. Wait for `#beat`, not a fixed 200ms.
- Rails does not complete until **all three** cards are clicked. One card is not a claim.
- Policy **Send** before **Simulate** is a teaching fail, not a hang. Reset is required.
- Stablecoin needs three *waves*, not three rapid clicks. Waves fire about every 5s. Budget time.
- `#claim-verify` must match the loaded row. A proof that asserts tape on a `verified: false` quote is wrong.
- `Esc` or **Back to street** exits. Re-enter via deep link + Enter rather than hunting the 3D door.
- Walking to a door and pressing `E` is a real entry point. It needs the walker near a collider. Deep link is the reliable agent path; if you skip walk-up, say `verified-unreachable` for the `E` / tap-marquee entries, not "verified via deep link."
