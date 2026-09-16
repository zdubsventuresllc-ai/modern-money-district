# Street walk

The 3D district is the walkable Live-night block at `/district.html`. A user enters from the splash, watches or skips an ~8s onboard, then walks the street toward a lit marquee. Shops are topics, not menus.

## Sub-features

- `street-splash` shows You’re watching / Modern Money and **Enter the district**.
- `street-boot` keeps Enter disabled with `Loading the block…` until the block is ready.
- `street-onboard` plays the 8.6s lower-third walk (first visit only).
- `street-skip` jumps to the street via **Skip intro**.
- `street-hud` shows the street HUD (`Pick a lit door` / `Walk to a lit marquee` or an Enter prompt).

## How to get to it (user POV)

- Open `/district.html` (footer link **3D block →** on Late Friday).
- Click **Enter the district**. First visit: watch the intro or tap **Skip intro**.
- Desktop: WASD walk, click the street to look. Phone: left stick + drag to look.
- Return visits skip onboard (`localStorage` key `mmd-onboard-v2`). This harness starts a fresh Chrome profile so onboard is first-visit.

## Driving it with control-mmd

Preconditions:

- Doctor is green.
- Browser session started (empty profile).
- Path is `/district.html` with **no** `?door=` (a door query skips the street and opens a beat/arcade).

- **Wait for boot.** Run `control-mmd browser goto --path /district.html` then `control-mmd browser wait --selector "#enter-btn" --text "Enter the district" --timeout 20000`. The button is enabled. Screenshot `$EVIDENCE/splash.png`.
- **Enter.** Run `control-mmd browser click --role button --name "Enter the district"`. `#splash` becomes hidden. Either `#onboard` is visible (first visit) or `#hud` is visible (reduced motion / already seen).
- **Skip intro.** If `#onboard-skip` is visible, run `control-mmd browser click --role button --name "Skip intro"`. `#onboard` hides; `#hud` shows.
- **Street HUD.** Run `control-mmd browser wait --selector "#hud" --state visible` and `control-mmd browser expect --selector "#nearest" --text "door"`. Copy is `Pick a lit door` or, after a few frames, `Walk to a lit marquee` when no door is near.
- **Proof.** `control-mmd browser screenshot --path "$EVIDENCE/street.png" --feature street-walk --entry enter-skip` and a snapshot. Identity: Stabledash Live chrome + street HUD. `#beat`, `#claim`, and `#arcade-hud` stay hidden.

## Gotchas

- Enter starts as `Loading the block…` and `disabled`. Clicking early does nothing. Wait for the restored label.
- `?door=arcade|stablecoin|rails|policy` after Enter **skips the street**. That is a different feature. Drop the query to verify this one.
- A reused Chrome profile skips onboard. If you needed onboard and did not see it, the profile was not fresh — `browser start` again, do not mark onboard verified via the skip path only.
- Pointer lock (`Click the street to look around`) is desktop-only. Agents do not need it for this proof.
- WebGL must come up. If `#enter-btn` never leaves `Loading the block…`, doctor the instance and check Chrome has GL (`--use-gl=angle` is already on the helper's Chrome).
- Reduced-motion users skip onboard automatically. Note that in the evidence meta if `#onboard` never appears.
