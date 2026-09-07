import * as THREE from "three";
import { beatChrome, mountBeat, pickClaim, rewardHtml } from "./beats";
import { loadClaims } from "./claims";
import { buildDistrict, nearestDoor, type Door } from "./district/buildDistrict";
import { Walker } from "./player/walker";
import { SettlementRun, bestGhostTime } from "./arcade/settlementRun";
import { STOREFRONTS, palette } from "./theme";
import type { ClaimsFile, GameMode, StorefrontId } from "./types";

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

const canvas = $<HTMLCanvasElement>("gl");
const splash = $("splash");
const hud = $("hud");
const prompt = $("prompt");
const promptLabel = $("prompt-label");
const nearestEl = $("nearest");
const lookHint = $("look-hint");
const beatPanel = $("beat");
const beatKicker = $("beat-kicker");
const beatName = $("beat-name");
const beatBody = $("beat-body");
const beatBack = $<HTMLButtonElement>("beat-back");
const beatPlay = $<HTMLButtonElement>("beat-play");
const arcadeHud = $("arcade-hud");
const arcadeClock = $("arcade-clock");
const arcadeGhost = $("arcade-ghost");
const arcadeClaim = $("arcade-claim");
const arcadeExit = $<HTMLButtonElement>("arcade-exit");
const countdownEl = $("countdown");
const resultPanel = $("arcade-result");
const resultTitle = $("result-title");
const resultTime = $("result-time");
const resultGhost = $("result-ghost");
const resultReward = $("result-reward");
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
renderer.toneMappingExposure = 1.0;

const streetScene = new THREE.Scene();
streetScene.background = new THREE.Color(palette.ink);
streetScene.fog = new THREE.FogExp2(palette.ink, 0.018);

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
let unmountBeat: (() => void) | null = null;
const coarse = matchMedia("(pointer: coarse)").matches;

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
  hud.classList.toggle("hidden", next !== "street");
  beatPanel.classList.toggle("hidden", next !== "claim");
  arcadeHud.classList.toggle("hidden", next !== "arcade");
  resultPanel.classList.toggle("hidden", next !== "arcade-result");
  touch.classList.toggle("hidden", !(coarse && next === "street"));
  if (next !== "street") walker.exitLock();
  if (next !== "claim") {
    unmountBeat?.();
    unmountBeat = null;
    beatPlay.classList.add("hidden");
  }
}

function openBeat(id: StorefrontId): void {
  const chrome = beatChrome(id);
  beatKicker.textContent = chrome.kicker;
  beatName.textContent = chrome.name;
  beatPlay.classList.add("hidden");
  unmountBeat?.();
  unmountBeat = mountBeat(id, beatBody, claims, {
    onComplete: () => {
      /* punchline already in panel */
    },
    onPlayArcade: () => startArcade(),
  });
  if (id === "arcade") {
    /* arcade intro has its own CTA */
  }
  setMode("claim");
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
  // No claim spoil mid-run — punchline lands on arcade-result.
  arcadeClaim.textContent = "Clear the corridor. Guest line drops after you settle.";
  const best = bestGhostTime();
  arcadeGhost.textContent = best ? `Ghost ${formatClock(best)}` : "Ghost —";
  setMode("arcade");
}

function showArcadeResult(title: string, time: number | null): void {
  resultTitle.textContent = title;
  resultTime.textContent = time == null ? "DNF" : formatClock(time);
  const best = bestGhostTime();
  if (time != null && best != null && time <= best + 0.0001) {
    resultGhost.textContent = "New ghost — shareable Settlement Run time.";
  } else if (best != null) {
    resultGhost.textContent = `Best ghost ${formatClock(best)}`;
  } else {
    resultGhost.textContent = "No prior ghost.";
  }
  // Teach-then-reward: punchline after Settlement Run (prefer blake-aave / kevin-align).
  const claim = pickClaim(claims, "arcade", ["blake-aave", "kevin-align"]);
  resultReward.innerHTML = rewardHtml(
    claim,
    time == null
      ? "Corridor closed — still earn the line. Ghost waits for a clear run."
      : "You settled. Share the ghost time — that’s the X unit.",
  );
  setMode("arcade-result");
}

function returnToStreet(): void {
  arcade?.dispose();
  arcade = null;
  walker.reset(new THREE.Vector3(6.2, 1.65, 5.2), 0);
  setMode("street");
  if (!coarse) walker.requestLock(canvas);
}

enterBtn.addEventListener("click", () => {
  setMode("street");
  if (!coarse) walker.requestLock(canvas);
});

canvas.addEventListener("click", (e) => {
  if (mode !== "street") return;
  if (!coarse) walker.requestLock(canvas);
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(
    district.doors.map((d) => d.mesh),
    false,
  );
  const id = hits[0]?.object.userData.storefrontId as StorefrontId | undefined;
  if (id) openBeat(id);
});

prompt.addEventListener("click", () => {
  if (activeDoor) openBeat(activeDoor.id);
});

beatBack.addEventListener("click", () => {
  setMode("street");
  if (!coarse) walker.requestLock(canvas);
});

beatPlay.addEventListener("click", () => {
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

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyE" && mode === "street" && activeDoor) {
    e.preventDefault();
    openBeat(activeDoor.id);
  }
  if (e.code === "Escape") {
    if (mode === "claim") {
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

let lookTouch: number | null = null;
let lookX = 0;
let lookY = 0;
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
  if (mode === "arcade") {
    const mid = window.innerWidth / 2;
    arcade?.shift(e.clientX < mid ? -1 : 1);
    return;
  }
  if (mode !== "street") return;
  if (coarse && e.target instanceof Node && stick.contains(e.target)) {
    stickTouch = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stickFromEvent(e);
    return;
  }
  if (coarse) {
    lookTouch = e.pointerId;
    lookX = e.clientX;
    lookY = e.clientY;
  }
});

window.addEventListener("pointermove", (e) => {
  if (mode !== "street") return;
  if (e.pointerId === stickTouch) {
    stickFromEvent(e);
    return;
  }
  if (e.pointerId === lookTouch) {
    walker.lookDelta(e.clientX - lookX, e.clientY - lookY);
    lookX = e.clientX;
    lookY = e.clientY;
  }
});

function endPointer(e: PointerEvent): void {
  if (e.pointerId === stickTouch) {
    stickTouch = null;
    walker.stick.x = 0;
    walker.stick.z = 0;
    stickKnob.style.transform = "";
  }
  if (e.pointerId === lookTouch) lookTouch = null;
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

  if (mode === "street") {
    walker.update(dt, district.colliders);
    activeDoor = nearestDoor(district.doors, walker.position);
    if (activeDoor) {
      prompt.classList.remove("hidden");
      promptLabel.textContent = `Enter ${storefrontName(activeDoor.id)}`;
      nearestEl.textContent = storefrontName(activeDoor.id);
      activeDoor.mesh.material = pulseDoor(now, true);
    } else {
      prompt.classList.add("hidden");
      nearestEl.textContent = "Street";
    }
    for (const door of district.doors) {
      if (door !== activeDoor) door.mesh.material = pulseDoor(now, false);
    }
    lookHint.classList.toggle("hidden", coarse || walker.locked);
    renderer.render(streetScene, camera);
  } else if (mode === "claim" || mode === "splash") {
    renderer.render(streetScene, camera);
  } else if (mode === "arcade" && arcade) {
    const phase = arcade.update(dt);
    arcadeClock.textContent = `T+ ${formatClock(arcade.time)}`;
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
  emissiveIntensity: 0.05,
  roughness: 0.45,
});
const doorHot = new THREE.MeshStandardMaterial({
  color: 0x11100e,
  emissive: palette.lime,
  emissiveIntensity: 0.4,
  roughness: 0.4,
});

function pulseDoor(_now: number, hot: boolean): THREE.Material {
  return hot ? doorHot : doorIdle;
}

window.addEventListener("beforeunload", () => {
  unbindWalker();
  arcade?.dispose();
  unmountBeat?.();
});

setMode("splash");
requestAnimationFrame(tick);
