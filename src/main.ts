import * as THREE from "three";
import { createBeats, type BeatKind } from "./beats/beats";
import { claimsFor, loadClaims } from "./claims";
import { buildDistrict, nearestDoor, type Door } from "./district/buildDistrict";
import { Walker } from "./player/walker";
import { SettlementRun, bestGhostTime } from "./arcade/settlementRun";
import { LESSONS, STOREFRONTS, palette } from "./theme";
import type { Claim, ClaimsFile, GameMode, StorefrontId } from "./types";

const ONBOARD_KEY = "mmd-onboard-v1";

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

const canvas = $<HTMLCanvasElement>("gl");
const splash = $("splash");
const onboard = $("onboard");
const onboardLine = $("onboard-line");
const onboardSkip = $<HTMLButtonElement>("onboard-skip");
const hud = $("hud");
const prompt = $("prompt");
const promptLabel = $("prompt-label");
const nearestEl = $("nearest");
const lookHint = $("look-hint");
const beatPanel = $("beat");
const beatKicker = $("beat-kicker");
const beatTitle = $("beat-title");
const beatLede = $("beat-lede");
const beatStage = $("beat-stage");
const beatStatus = $("beat-status");
const beatBack = $<HTMLButtonElement>("beat-back");
const claimPanel = $("claim");
const claimKicker = $("claim-kicker");
const claimName = $("claim-name");
const claimLesson = $("claim-lesson");
const claimText = $("claim-text");
const claimGuest = $("claim-guest");
const claimEpisode = $("claim-episode");
const claimEpisodeLink = $<HTMLAnchorElement>("claim-episode-link");
const claimVerify = $("claim-verify");
const claimNote = $("claim-note");
const claimNotice = $("claim-notice");
const claimBack = $<HTMLButtonElement>("claim-back");
const claimPlay = $<HTMLButtonElement>("claim-play");
const arcadeHud = $("arcade-hud");
const arcadeClock = $("arcade-clock");
const arcadeGhost = $("arcade-ghost");
const arcadeCoach = $("arcade-coach");
const arcadeLanes = $("arcade-lanes");
const arcadeExit = $<HTMLButtonElement>("arcade-exit");
const countdownEl = $("countdown");
const resultPanel = $("arcade-result");
const resultTitle = $("result-title");
const resultTime = $("result-time");
const resultGhost = $("result-ghost");
const resultLesson = $("result-lesson");
const resultClaim = $("result-claim");
const resultByline = $("result-byline");
const resultVerify = $("result-verify");
const resultEpisodeLink = $<HTMLAnchorElement>("result-episode-link");
const resultCopy = $<HTMLButtonElement>("result-copy");
const resultAgain = $<HTMLButtonElement>("result-again");
const resultStreet = $<HTMLButtonElement>("result-street");
const enterBtn = $<HTMLButtonElement>("enter-btn");
const touch = $("touch");
const stick = $("stick");
const stickKnob = $("stick-knob");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const streetScene = new THREE.Scene();
streetScene.background = new THREE.Color(palette.midnight);
streetScene.fog = new THREE.FogExp2(0x1a1c17, 0.018);

const camera = new THREE.PerspectiveCamera(
  68,
  window.innerWidth / window.innerHeight,
  0.08,
  120,
);

const district = buildDistrict();
streetScene.add(district.group);

const walker = new Walker(camera);
walker.reset(district.spawn, district.spawnYaw);
const unbindWalker = walker.bind(canvas);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

let mode: GameMode = "splash";
let claims: ClaimsFile | null = null;
let activeDoor: Door | null = null;
let arcade: SettlementRun | null = null;
let last = performance.now();
let onboardT = 0;

interface OnboardBeat {
  t: number;
  line: string;
  pos: [number, number, number];
  look: [number, number, number];
}

const onboardBeats: OnboardBeat[] = [
  { t: 0, line: "Money still waits on bank hours.", pos: [0, 1.7, 3.2], look: [0, 1.3, -2] },
  { t: 2.1, line: "Stablecoins move the dollar at 2am.", pos: [-3.4, 2.05, -0.4], look: [-6.2, 2.1, -8.2] },
  { t: 4.1, line: "ACH waits. Cards tax. USDC clears.", pos: [3.4, 2.05, -0.4], look: [6.2, 2.1, -8.2] },
  { t: 6.1, line: "On-chain has no undo. Simulate first.", pos: [-1.2, 2.2, 3.6], look: [-6.2, 2, 8.2] },
  { t: 7.4, line: "Pick a door. Play the beat. Earn the line.", pos: [0, 1.7, 2.6], look: [6.2, 1.8, 8.2] },
];

function isCoarse(): boolean {
  return matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

function reduceMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function seenOnboard(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === "1";
  } catch {
    return false;
  }
}

function markOnboard(): void {
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
  } catch {
    /* ignore */
  }
}

function isUi(event: Event): boolean {
  const target = event.target;
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, .prompt, .sheet, .onboard, input"))
  );
}

loadClaims()
  .then((file) => {
    claims = file;
  })
  .catch((err: unknown) => {
    console.error(err);
  });

function storefrontName(id: StorefrontId): string {
  return STOREFRONTS.find((s) => s.id === id)?.name ?? id;
}

function setMode(next: GameMode): void {
  mode = next;
  splash.classList.toggle("hidden", next !== "splash");
  onboard.classList.toggle("hidden", next !== "onboard");
  hud.classList.toggle("hidden", next !== "street");
  beatPanel.classList.toggle("hidden", next !== "beat");
  claimPanel.classList.toggle("hidden", next !== "claim");
  arcadeHud.classList.toggle("hidden", next !== "arcade");
  resultPanel.classList.toggle("hidden", next !== "arcade-result");
  touch.classList.toggle("hidden", !(isCoarse() && next === "street"));
  if (next !== "street") walker.exitLock();
}

const beats = createBeats({
  stage: beatStage,
  kicker: beatKicker,
  title: beatTitle,
  lede: beatLede,
  status: beatStatus,
  onComplete: (id) => {
    openClaim(id);
  },
});

function paintClaim(target: {
  name: HTMLElement;
  lesson: HTMLElement;
  text: HTMLElement;
  guest: HTMLElement;
  episode?: HTMLElement;
  verify: HTMLElement;
  note?: HTMLElement;
  notice?: HTMLElement;
  link: HTMLAnchorElement;
}, id: StorefrontId): Claim | undefined {
  const def = STOREFRONTS.find((s) => s.id === id);
  const list = claims ? claimsFor(claims, id) : [];
  const claim = list.find((c) => c.verified) ?? list[0];
  target.name.textContent = def?.name ?? id;
  target.lesson.textContent = LESSONS[id];
  target.text.textContent = claim?.quote ?? "No claim mapped for this door.";
  const who = [claim?.guest, claim?.company, claim?.role]
    .filter((part) => part && part.length)
    .join(" · ");
  target.guest.textContent = who || "Guest";
  if (target.episode) {
    target.episode.textContent = claim
      ? `${claim.episode}${claim.date ? ` · ${claim.date}` : ""}`
      : "";
  }
  const video = claim?.videoUrl ?? claims?.meta.episodeYoutube ?? "";
  if (video) {
    target.link.href = video;
    target.link.classList.remove("hidden");
  } else {
    target.link.classList.add("hidden");
  }
  if (claim?.verified) {
    target.verify.textContent = "Verified tape · episode cite";
    target.verify.classList.add("is-tape");
    target.verify.classList.remove("is-framing");
  } else {
    target.verify.textContent = "Product framing · confirm on-air";
    target.verify.classList.add("is-framing");
    target.verify.classList.remove("is-tape");
  }
  if (target.note) {
    const extra = [claim?.note, claim?.clipNote].filter(Boolean).join(" · ");
    if (extra) {
      target.note.textContent = extra;
      target.note.classList.remove("hidden");
    } else {
      target.note.classList.add("hidden");
    }
  }
  if (target.notice) {
    target.notice.textContent = "";
  }
  return claim;
}

function openClaim(id: StorefrontId): void {
  beats.stop();
  claimKicker.textContent = "You felt it";
  paintClaim(
    {
      name: claimName,
      lesson: claimLesson,
      text: claimText,
      guest: claimGuest,
      episode: claimEpisode,
      verify: claimVerify,
      note: claimNote,
      notice: claimNotice,
      link: claimEpisodeLink,
    },
    id,
  );
  claimPlay.classList.toggle("hidden", id !== "agent-pay-arcade");
  setMode("claim");
}

function enterDoor(id: StorefrontId): void {
  if (id === "agent-pay-arcade") {
    startArcade();
    return;
  }
  beats.start(id as BeatKind);
  setMode("beat");
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}

function startArcade(): void {
  arcade?.dispose();
  arcade = new SettlementRun();
  arcade.camera.aspect = window.innerWidth / window.innerHeight;
  arcade.camera.updateProjectionMatrix();
  const best = bestGhostTime();
  arcadeGhost.textContent = best ? `Ghost ${formatClock(best)}` : "Ghost —";
  setMode("arcade");
}

function paintArcadeResult(title: string, time: number | null): void {
  resultTitle.textContent = title;
  resultTime.textContent = time == null ? "DNF" : formatClock(time);
  const best = bestGhostTime();
  if (time != null && best != null && time <= best + 0.0001) {
    resultGhost.textContent = "New ghost on this phone.";
  } else if (best != null) {
    resultGhost.textContent = `Best ghost ${formatClock(best)}`;
  } else {
    resultGhost.textContent = "No prior ghost.";
  }
  const claim = paintClaim(
    {
      name: resultTitle,
      lesson: resultLesson,
      text: resultClaim,
      guest: resultByline,
      verify: resultVerify,
      link: resultEpisodeLink,
    },
    "agent-pay-arcade",
  );
  resultTitle.textContent = title;
  resultByline.textContent = claim
    ? `— ${[claim.guest, claim.episode].filter(Boolean).join(" · ")}`
    : "";
}

function showArcadeResult(title: string, time: number | null): void {
  paintArcadeResult(title, time);
  setMode("arcade-result");
}

function returnToStreet(): void {
  arcade?.dispose();
  arcade = null;
  beats.stop();
  walker.reset(new THREE.Vector3(6.2, 1.65, 5.2), 0);
  setMode("street");
  if (!isCoarse()) walker.requestLock(canvas);
}

function dropToStreet(): void {
  markOnboard();
  walker.reset(district.spawn, district.spawnYaw);
  setMode("street");
  if (!isCoarse()) walker.requestLock(canvas);
}

function startOnboard(): void {
  if (seenOnboard() || reduceMotion()) {
    dropToStreet();
    return;
  }
  onboardT = 0;
  walker.reset(district.spawn, district.spawnYaw);
  setMode("onboard");
}

function sampleOnboard(t: number): OnboardBeat {
  let beat = onboardBeats[0];
  for (const next of onboardBeats) {
    if (t >= next.t) beat = next;
  }
  return beat;
}

function updateOnboard(dt: number): void {
  onboardT += dt;
  const beat = sampleOnboard(onboardT);
  onboardLine.textContent = beat.line;
  const look = new THREE.Vector3(beat.look[0], beat.look[1], beat.look[2]);
  camera.position.lerp(
    new THREE.Vector3(beat.pos[0], beat.pos[1], beat.pos[2]),
    1 - Math.exp(-dt * 2.4),
  );
  camera.lookAt(look);
  if (onboardT >= 8.2) dropToStreet();
}

function bootDoor(): StorefrontId | null {
  const raw = new URLSearchParams(location.search).get("door");
  if (raw === "arcade" || raw === "agent-pay-arcade") return "agent-pay-arcade";
  if (raw === "stablecoin" || raw === "stablecoin-shop") return "stablecoin-shop";
  if (raw === "rails" || raw === "rails-station") return "rails-station";
  if (raw === "policy" || raw === "policy-desk") return "policy-desk";
  return null;
}

enterBtn.addEventListener("click", () => {
  const door = bootDoor();
  if (door) {
    markOnboard();
    enterDoor(door);
    return;
  }
  startOnboard();
});

onboardSkip.addEventListener("click", () => {
  dropToStreet();
});

let dragLook = false;
let dragX = 0;
let dragY = 0;
let dragMoved = false;

canvas.addEventListener("pointerdown", (e) => {
  if (mode !== "street") return;
  if (e.button !== 0) return;
  dragLook = true;
  dragMoved = false;
  dragX = e.clientX;
  dragY = e.clientY;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    /* pointer already released */
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragLook || walker.locked) return;
  const dx = e.clientX - dragX;
  const dy = e.clientY - dragY;
  if (Math.hypot(dx, dy) > 3) dragMoved = true;
  walker.lookDelta(dx, dy);
  dragX = e.clientX;
  dragY = e.clientY;
});

canvas.addEventListener("pointerup", (e) => {
  if (mode !== "street") {
    dragLook = false;
    return;
  }
  const wasDrag = dragLook && dragMoved;
  dragLook = false;

  const rect = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(
    district.doors.flatMap((d) => d.hit),
    false,
  );
  const id = hits[0]?.object.userData.storefrontId as StorefrontId | undefined;
  if (id) {
    enterDoor(id);
    return;
  }
  if (!wasDrag && !isCoarse()) walker.requestLock(canvas);
});

prompt.addEventListener("click", () => {
  if (activeDoor) enterDoor(activeDoor.id);
});

beatBack.addEventListener("click", () => {
  beats.stop();
  setMode("street");
  if (!isCoarse()) walker.requestLock(canvas);
});

claimBack.addEventListener("click", () => {
  setMode("street");
  if (!isCoarse()) walker.requestLock(canvas);
});

claimPlay.addEventListener("click", () => {
  startArcade();
});

arcadeExit.addEventListener("click", () => {
  arcade?.abort();
  returnToStreet();
});

resultAgain.addEventListener("click", () => {
  startArcade();
});

resultStreet.addEventListener("click", () => {
  returnToStreet();
});

resultCopy.addEventListener("click", async () => {
  const text = `${resultTitle.textContent ?? "Settlement Run"} ${resultTime.textContent ?? ""} — Modern Money District`;
  try {
    await navigator.clipboard.writeText(text);
    resultCopy.textContent = "Copied";
  } catch {
    resultCopy.textContent = "Copy failed";
  }
});

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyE" && mode === "street" && activeDoor) {
    e.preventDefault();
    enterDoor(activeDoor.id);
  }
  if (e.code === "Escape") {
    if (mode === "onboard") {
      dropToStreet();
    } else if (mode === "beat") {
      beats.stop();
      setMode("street");
    } else if (mode === "claim") {
      setMode("street");
    } else if (mode === "arcade") {
      arcade?.abort();
      returnToStreet();
    } else if (mode === "arcade-result") {
      returnToStreet();
    }
  }
  if (mode === "arcade") {
    if (e.code === "KeyA" || e.code === "ArrowLeft") arcade?.shift(-1);
    if (e.code === "KeyD" || e.code === "ArrowRight") arcade?.shift(1);
  }
});

let stickTouch: number | null = null;

function stickFromEvent(e: PointerEvent): void {
  const rect = stick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = e.clientX - cx;
  const dy = e.clientY - cy;
  const max = rect.width / 2 - 8;
  const len = Math.hypot(dx, dy);
  const scale = len > max ? max / len : 1;
  const x = dx * scale;
  const y = dy * scale;
  stickKnob.style.transform = `translate(${x}px, ${y}px)`;
  walker.stick.x = x / max;
  walker.stick.z = y / max;
}

window.addEventListener("pointerdown", (e) => {
  if (isUi(e)) return;
  if (mode === "arcade") {
    const mid = window.innerWidth / 2;
    arcade?.shift(e.clientX < mid ? -1 : 1);
    return;
  }
  if (mode !== "street") return;
  if (isCoarse() && e.target instanceof Node && stick.contains(e.target)) {
    stickTouch = e.pointerId;
    try {
      stick.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    stickFromEvent(e);
  }
});

window.addEventListener("pointermove", (e) => {
  if (mode !== "street") return;
  if (e.pointerId === stickTouch) stickFromEvent(e);
});

function endPointer(e: PointerEvent): void {
  if (e.pointerId === stickTouch) {
    stickTouch = null;
    walker.stick.x = 0;
    walker.stick.z = 0;
    stickKnob.style.transform = "";
  }
}

window.addEventListener("pointerup", endPointer);
window.addEventListener("pointercancel", endPointer);

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (arcade) {
    arcade.camera.aspect = w / h;
    arcade.camera.updateProjectionMatrix();
  }
});

function tick(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (mode === "onboard") {
    updateOnboard(dt);
    renderer.render(streetScene, camera);
  } else if (mode === "street") {
    walker.update(dt, district.colliders);
    activeDoor = nearestDoor(district.doors, walker.position);
    if (activeDoor) {
      prompt.classList.remove("hidden");
      promptLabel.textContent = `Play ${storefrontName(activeDoor.id)}`;
      nearestEl.classList.add("hidden");
      activeDoor.mesh.material = pulseDoor(true);
      activeDoor.sign.material = activeDoor.signHot;
    } else {
      prompt.classList.add("hidden");
      nearestEl.classList.remove("hidden");
      nearestEl.textContent = "Pick a door";
    }
    for (const door of district.doors) {
      if (door !== activeDoor) {
        door.mesh.material = pulseDoor(false);
        door.sign.material = door.signIdle;
      }
    }
    lookHint.classList.toggle("hidden", isCoarse() || walker.locked);
    renderer.render(streetScene, camera);
  } else if (mode === "beat") {
    beats.update(dt);
    renderer.render(streetScene, camera);
  } else if (mode === "claim" || mode === "splash") {
    renderer.render(streetScene, camera);
  } else if (mode === "arcade" && arcade) {
    const phase = arcade.update(dt);
    arcadeClock.textContent = `T+ ${formatClock(arcade.time)}`;
    const coach = arcade.coachLine();
    arcadeCoach.textContent = coach;
    arcadeCoach.classList.toggle("hidden", !coach);
    for (const el of arcadeLanes.querySelectorAll("[data-lane]")) {
      el.classList.toggle(
        "is-hot",
        Number((el as HTMLElement).dataset.lane) === arcade.laneIndex,
      );
    }
    if (arcade.phase === "countdown") {
      countdownEl.classList.remove("hidden");
      countdownEl.textContent = arcade.countdownLabel();
    } else {
      countdownEl.classList.add("hidden");
    }
    renderer.render(arcade.scene, arcade.camera);
    if (phase === "won") {
      showArcadeResult("Settled T+0", arcade.resultTime());
    } else if (phase === "dnf") {
      showArcadeResult("Window closed", null);
    }
  } else if (mode === "arcade-result" && arcade) {
    renderer.render(arcade.scene, arcade.camera);
  }

  requestAnimationFrame(tick);
}

const doorIdle = new THREE.MeshStandardMaterial({
  color: 0x11100e,
  emissive: palette.ivory,
  emissiveIntensity: 0.06,
  roughness: 0.45,
});
const doorHot = new THREE.MeshStandardMaterial({
  color: 0x11100e,
  emissive: palette.ivory,
  emissiveIntensity: 0.12,
  roughness: 0.35,
});

function pulseDoor(hot: boolean): THREE.Material {
  return hot ? doorHot : doorIdle;
}

window.addEventListener("beforeunload", () => {
  unbindWalker();
  arcade?.dispose();
  beats.stop();
});

setMode("splash");
requestAnimationFrame(tick);
