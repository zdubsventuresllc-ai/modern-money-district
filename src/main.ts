import * as THREE from "three";
import { claimsFor, loadClaims, primaryClaim } from "./claims";
import { buildDistrict, nearestDoor, type Door } from "./district/buildDistrict";
import { Walker } from "./player/walker";
import {
  SettlementRun,
  bestGhostTime,
} from "./arcade/settlementRun";
import { STOREFRONTS, palette } from "./theme";
import type { Claim, ClaimsFile, GameMode, StorefrontId } from "./types";

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
const claimPanel = $("claim");
const claimKicker = $("claim-kicker");
const claimName = $("claim-name");
const claimText = $("claim-text");
const claimGuest = $("claim-guest");
const claimEpisode = $("claim-episode");
const claimEpisodeLink = $<HTMLAnchorElement>("claim-episode-link");
const claimVerify = $("claim-verify");
const claimNote = $("claim-note");
const claimNotice = $("claim-notice");
const claimBack = $<HTMLButtonElement>("claim-back");
const claimPlay = $<HTMLButtonElement>("claim-play");
const claimPrev = $<HTMLButtonElement>("claim-prev");
const claimNext = $<HTMLButtonElement>("claim-next");
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
renderer.toneMappingExposure = 1.05;

const streetScene = new THREE.Scene();
streetScene.background = new THREE.Color(palette.ink);

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
let activeStorefront: StorefrontId | null = null;
let claimIndex = 0;
let arcade: SettlementRun | null = null;
let last = performance.now();
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
  claimPanel.classList.toggle("hidden", next !== "claim");
  arcadeHud.classList.toggle("hidden", next !== "arcade");
  resultPanel.classList.toggle("hidden", next !== "arcade-result");
  touch.classList.toggle("hidden", !(coarse && next === "street"));
  if (next !== "street") walker.exitLock();
}

function renderClaim(id: StorefrontId, index: number): void {
  const def = STOREFRONTS.find((s) => s.id === id);
  const list = claims ? claimsFor(claims, id) : [];
  const safeIndex = list.length
    ? ((index % list.length) + list.length) % list.length
    : 0;
  claimIndex = safeIndex;
  const claim: Claim | undefined = list[safeIndex];
  claimKicker.textContent = def?.subtitle ?? "STOREFRONT";
  claimName.textContent = def?.name ?? id;
  claimText.textContent = claim?.quote ?? "No claim mapped for this door.";
  const who = [claim?.guest, claim?.company, claim?.role]
    .filter((part) => part && part.length)
    .join(" · ");
  claimGuest.textContent = who || "Guest";
  claimEpisode.textContent = claim
    ? `${claim.episode}${claim.date ? ` · ${claim.date}` : ""}`
    : "";
  const video = claim?.videoUrl ?? claims?.meta.episodeYoutube ?? "";
  if (video) {
    claimEpisodeLink.href = video;
    claimEpisodeLink.classList.remove("hidden");
  } else {
    claimEpisodeLink.classList.add("hidden");
  }
  if (claim && !claim.verified) {
    claimVerify.textContent = "product framing / confirm on-air";
    claimVerify.classList.add("is-framing");
  } else {
    claimVerify.textContent = claim ? "VERIFIED · EPISODE CITE" : "";
    claimVerify.classList.remove("is-framing");
  }
  const extra = [claim?.note, claim?.clipNote].filter(Boolean).join(" · ");
  if (extra) {
    claimNote.textContent = extra;
    claimNote.classList.remove("hidden");
  } else {
    claimNote.classList.add("hidden");
  }
  claimNotice.textContent = claims?.meta.sourceNote ?? "";
  claimPrev.classList.toggle("hidden", list.length < 2);
  claimNext.classList.toggle("hidden", list.length < 2);
  claimPlay.classList.toggle("hidden", id !== "agent-pay-arcade");
}

function openClaim(id: StorefrontId): void {
  activeStorefront = id;
  const list = claims ? claimsFor(claims, id) : [];
  const firstTape = list.findIndex((c) => c.verified);
  claimIndex = firstTape >= 0 ? firstTape : 0;
  renderClaim(id, claimIndex);
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
  const claim = claims ? primaryClaim(claims, "agent-pay-arcade") : undefined;
  arcadeClaim.textContent = claim
    ? `GUEST SAID… ${claim.quote} — ${claim.guest} · ${claim.episode}`
    : "";
  const best = bestGhostTime();
  arcadeGhost.textContent = best
    ? `GHOST ${formatClock(best)}`
    : "GHOST —";
  setMode("arcade");
}

function showArcadeResult(title: string, time: number | null): void {
  resultTitle.textContent = title;
  resultTime.textContent = time == null ? "DNF" : formatClock(time);
  const best = bestGhostTime();
  if (time != null && best != null && time <= best + 0.0001) {
    resultGhost.textContent = "New ghost written to localStorage.";
  } else if (best != null) {
    resultGhost.textContent = `Best ghost ${formatClock(best)}`;
  } else {
    resultGhost.textContent = "No prior ghost.";
  }
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

let dragLook = false;
let dragX = 0;
let dragY = 0;
let dragMoved = false;

canvas.addEventListener("pointerdown", (e) => {
  if (mode !== "street") return;
  if (coarse) return;
  if (e.button !== 0) return;
  dragLook = true;
  dragMoved = false;
  dragX = e.clientX;
  dragY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
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
  if (coarse) return;

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
    openClaim(id);
    return;
  }
  if (!wasDrag) walker.requestLock(canvas);
});

prompt.addEventListener("click", () => {
  if (activeDoor) openClaim(activeDoor.id);
});

claimBack.addEventListener("click", () => {
  setMode("street");
  if (!coarse) walker.requestLock(canvas);
});

claimPlay.addEventListener("click", () => {
  startArcade();
});

claimPrev.addEventListener("click", () => {
  if (!activeStorefront) return;
  renderClaim(activeStorefront, claimIndex - 1);
});

claimNext.addEventListener("click", () => {
  if (!activeStorefront) return;
  renderClaim(activeStorefront, claimIndex + 1);
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
    openClaim(activeDoor.id);
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
      promptLabel.textContent = `ENTER ${storefrontName(activeDoor.id)}`;
      nearestEl.textContent = storefrontName(activeDoor.id);
      activeDoor.mesh.material = pulseDoor(now, true);
    } else {
      prompt.classList.add("hidden");
      nearestEl.textContent = "STREET";
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
      showArcadeResult("SETTLED T+0", arcade.resultTime());
    } else if (phase === "dnf") {
      showArcadeResult("WINDOW CLOSED", null);
    }
  } else if (mode === "arcade-result" && arcade) {
    renderer.render(arcade.scene, arcade.camera);
  }

  requestAnimationFrame(tick);
}

const doorIdle = new THREE.MeshStandardMaterial({
  color: 0x0a0a08,
  emissive: palette.amber,
  emissiveIntensity: 0.18,
  roughness: 0.4,
});
const doorHot = new THREE.MeshStandardMaterial({
  color: 0x0a0a08,
  emissive: palette.amber,
  emissiveIntensity: 0.85,
  roughness: 0.35,
});

function pulseDoor(_now: number, hot: boolean): THREE.Material {
  return hot ? doorHot : doorIdle;
}

window.addEventListener("beforeunload", () => {
  unbindWalker();
  arcade?.dispose();
});

setMode("splash");
requestAnimationFrame(tick);
