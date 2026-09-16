# Modern Money District verification map

This directory is the maintained source for verifying the user-facing behavior of Modern Money District. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch an isolated Vite instance with `control-mmd launch --port 55173 --mode dev`.
- Set `MMD_VERIFY_HOME=/tmp/mmd-verify` unless a concurrent run already owns that home — then use a new home **and** a new port.
- Run `control-mmd doctor` and require `/`, `/district.html`, and `/claims.json` green.
- Start Chrome CDP with `control-mmd browser start` so `localStorage` is empty (first visit).
- Never drive an instance this run did not start.
- Do not edit `public/claims.json` or invent `verified: true`.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer IDs, button accessible names, and `data-act` / `data-dir` / `data-lane` over canvas coordinates.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `control-mmd browser`.
- Deep links (`?door=`) only take effect after **Enter the district**.
- Restore nothing in product data (the app is stateless JSON). Cleanup the instance, keep proof artifacts.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with Late Friday or the district identity visible.
- Claim proof quotes the on-screen badge and the matching row in `/claims.json` — do not upgrade unverified rows.
- Record the feature ID and entry point used with every artifact (`evidence-init --id` plus `--feature` / `--entry` on screenshots when you pass them).
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-mmd` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Late Friday cabinet](./late-friday.md) — front door: attract, PRESS START, hop the payment grid.
- [Street walk](./street-walk.md) — 3D block splash, intro, walkable street HUD.
- [Storefront claim beat](./storefront-claim-beat.md) — door → 20–40s mechanic → cited guest line.
- [Settlement Run](./settlement-run.md) — Agent Pay Arcade, play-first, then settle or DNF.
- [Cited claim and share](./cited-claim-share.md) — verify badges, episode link, receipt / copy-time share.
