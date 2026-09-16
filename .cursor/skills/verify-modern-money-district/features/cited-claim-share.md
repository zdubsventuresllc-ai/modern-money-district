# Cited claim and share

After a playable beat (or a Late Friday level clear, or a finished Settlement Run) the user earns a guest line with a verify badge and a way to leave with the cite: Watch the episode, share the Late Friday receipt, or copy the arcade time.

## Sub-features

- `cite-badge-tape` — `On-air tape · verified` only when the loaded row has `verified: true`.
- `cite-badge-framing` — `Positioning · confirm on air` when the row is unverified or missing tape.
- `cite-watch` — **Watch the episode ↗** uses the row `videoUrl` or `meta.episodeYoutube`.
- `cite-receipt-share` — Late Friday game-over **Share receipt** (Web Share or clipboard).
- `cite-copy-time` — Settlement Run **Copy time** copies a line that includes `?door=arcade`.

## How to get to it (user POV)

- Finish a storefront beat (see storefront-claim-beat) and read the claim sheet.
- Clear a Late Friday level (five vendors) and read `#clear`.
- Finish or DNF a Settlement Run and read `#arcade-result`.
- Tap **Share receipt** or **Copy time**.

## Driving it with control-mmd

Preconditions:

- Doctor is green.
- You already reached a cite surface via a **real play path** (beat complete, level clear, or arcade result). Do not inject quote text.
- Fetch `/claims.json` with `control-mmd browser json --url /claims.json` and keep that file as the source of truth.

- **District claim badge.** On `#claim`, read `#claim-verify` and `#claim-text`. Find the matching `quote` in the JSON. If `verified` is true, the badge must be `On-air tape · verified`. If false, `Positioning · confirm on air`. Screenshot `$EVIDENCE/claim-badge.png`.
- **Episode link.** `#claim-episode-link` (or `#clear-watch` / `#result-episode-link`) has an `href` on YouTube when the row or meta has a URL. Assert the attribute. Do not navigate — leaving the origin abandons the instance.
- **Arcade copy time (only after a result).** On `#arcade-result`, run `control-mmd browser click --selector "#result-copy"`. Button text becomes `Copied` (or `Copy failed` in a locked-down Chrome). The isolated profile may lack clipboard permission — if so, record `Copy failed` as the observed state, not a product bug, unless a user-visible share string is also missing from `#result-time`.
- **Late Friday share (only after `#over`).** Click `#share`. Text becomes `Receipt copied` when clipboard works and Web Share is absent. Getting to `#over` requires losing three lives; do not fake `phase = "over"`.
- **Proof.** Badge screenshot + the claims JSON snippet (copy the matching object into `evidence/<id>/claim-row.json` as a fetch artifact, not a hand-edit). Meta names the door/level and the claim `id` from the file.

## Gotchas

- Never write `verified: true` into the repo to make a badge green. If tape is missing, the framing badge is the correct proof.
- Dual field names in JSON (`quote`/`claim`, `guest`/`guestName`, …) are aliases. The loader already normalizes them. Assert the rendered quote, not a particular key.
- `#clear-verify` on Late Friday uses the same strings as the district claim. Level 1 prefers a rails claim, 2 stablecoin, 3 policy, 4 arcade, then cycles; verified rows sort first.
- Clipboard and Web Share are environment-dependent. A failed copy in headless Chrome is not automatically a product regression — capture the button label and `#receipt-lesson` / `#result-time` as the user-visible share unit.
- Do not open the episode URL in the driven tab.
