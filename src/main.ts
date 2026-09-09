import * as THREE from "three";
import { createBeats, type BeatKind } from "./beats/beats";
import { claimsFor, loadClaims } from "./claims";
import { buildDistrict, nearestDoor, type District, type Door } from "./district/buildDistrict";
import { Walker } from "./player/walker";
import { SettlementRun, bestGhostTime } from "./arcade/settlementRun";
import { HEADLINES, LESSONS, STOREFRONTS, palette } from "./theme";
import type { Claim, ClaimsFile, GameMode, StorefrontId } from "./types";

const ONBOARD_KEY = "mmd-onboard-v2";

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

const canvas = $<HTMLCanvasElement>("gl");
const film = $<HTMLVideoElement>("film");
const splash = $("splash");
const onboard = $("onboard");
const onboardKicker = $("onboard-kicker");
const onboardLine = $("onboard-line");
const onboardText = $("onboard-text");
const onboardCard = onboard.querySelector<HTMLElement>(".lower-third");
const onboardSkip = $<HTMLButtonElement>("onboard-skip");
const hud = $("hud");
const prompt = $("prompt");
const promptLabel = $("prompt-label");
const nearestEl = $("nearest");
const lookHint = $("look-hint");
const sting = $("sting");
const stingVideo = $<HTMLVideoElement>("sting-video");
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
const arcadeHud = $("arcade-hud");
const arcadeClock = $("arcade-clock");
const arcadeGhost = $("arcade-ghost");
const arcadeCoach = $("arcade-coach");
const arcadeHit = $("arcade-hit");
const arcadeLanes = $("arcade-lanes");
const arcadeExit = $<HTMLButtonElement>("arcade-exit");
const countdownEl = $("countdown");
const resultPanel = $("arcade-result");
const resultTitle = $("result-title");
const resultTime = $("result-time");
const resultGhost = $("result-ghost");
const resultTally = $("result-tally");
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

/* ---------- renderer ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const streetScene = new THREE.Scene();
streetScene.background = new THREE.Color(palette.midnight);
streetScene.fog = new THREE.FogExp2(0x15151a, 0.02);

const camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.08, 140);

/** Three's FOV is vertical. Portrait phones need a wider vertical FOV to keep both marquees in frame. */
function fitFov(cam: THREE.PerspectiveCamera, aspect: number): void {
  const wantHorizontal = THREE.MathUtils.degToRad(84);
  const vertical = 2 * Math.atan(Math.tan(wantHorizontal / 2) / aspect);
  cam.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vertical), 62, 96);
  cam.aspect = aspect;
  cam.updateProjectionMatrix();
}
fitFov(camera, window.innerWidth / window.innerHeight);

/* ---------- state ---------- */
let mode: GameMode = "splash";
let claims: ClaimsFile | null = null;
let activeDoor: Door | null = null;
let arcade: SettlementRun | null = null;
let district: District | null = null;
let walker: Walker | null = null;
let last = performance.now();
let onboardStart = 0;
let onboardIndex = -1;
let hitShownAt = -1;

interface OnboardBeat {
  t: number;
  kicker: string;
  line: string;
  text: string;
  pos: [number, number, number];
  look: [number, number, number];
}

const onboardBeats: OnboardBeat[] = [
  {
    t: 0,
    kicker: "Live night · one block",
    line: "MONEY STILL WAITS ON BANK HOURS",
    text: "Your dollar clocks out Friday at 5. The block does not. Four doors, each one a piece of modern money.",
    pos: [0, 1.7, 3.0],
    look: [0, 2.6, -6],
  },
  {
    t: 2.4,
    kicker: "Stablecoin Shop",
    line: "THE DOLLAR THAT TRADES AT 2AM",
    text: "Hold the peg through three redemption waves. Reserves answer, or the dollar slips.",
    pos: [-3.2, 2.0, -0.6],
    look: [-6.2, 3.2, -8],
  },
  {
    t: 4.6,
    kicker: "Rails Station",
    line: "ACH WAITS. CARDS TAX. USDC CLEARS",
    text: "Same $1,000 to Singapore on a Saturday. Ride all three rails and feel the difference.",
    pos: [3.2, 2.0, -0.6],
    look: [6.2, 3.2, -8],
  },
  {
    t: 6.6,
    kicker: "Policy Desk · Agent Pay Arcade",
    line: "NO UNDO ONCHAIN. SIMULATE FIRST",
    text: "Then run the settlement corridor. Every punchline on this block is a real guest, cited to the episode.",
    pos: [0.4, 2.1, 1.6],
    look: [3, 3.0, 8],
  },
];
const ONBOARD_END = 8.6;

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
  return target instanceof Element && Boolean(target.closest("button, a, .prompt, .sheet, .onboard, input, .skip"));
}

/* ---------- fonts before canvas signs ---------- */
async function fontsReady(): Promise<void> {
  const wanted = [
    "500 40px Aspekta",
    "400 40px Aspekta",
    "400 40px 'Instrument Serif'",
    "italic 400 40px 'Instrument Serif'",
  ];
  const timeout = new Promise<void>((r) => window.setTimeout(r, 2200));
  try {
    await Promise.race([Promise.all(wanted.map((f) => document.fonts.load(f))).then(() => undefined), timeout]);
  } catch {
    /* fall back to system fonts */
  }
}

/* ---------- media ---------- */
function startFilm(): void {
  film.classList.add("is-on");
  void film.play().catch(() => {
    /* autoplay may need the gesture; Enter re-tries */
  });
}
function playSting(then: () => void): void {
  if (reduceMotion() || !stingVideo.src) {
    then();
    return;
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    sting.classList.add("hidden");
    stingVideo.pause();
    then();
  };
  sting.classList.remove("hidden");
  try {
    stingVideo.currentTime = 1.05;
  } catch {
    /* not seekable yet */
  }
  const p = stingVideo.play();
  if (p) p.catch(finish);
  window.setTimeout(finish, 1050);
  sting.addEventListener("pointerdown", finish, { once: true });
}

/* ---------- ui ---------- */
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
  film.classList.toggle("is-on", next === "splash");
  if (next !== "street") walker?.exitLock();
}

const beats = createBeats({
  stage: beatStage,
  kicker: beatKicker,
  title: beatTitle,
  lede: beatLede,
  status: beatStatus,
  onComplete: (id) => openClaim(id),
});

function paintClaim(
  target: {
    name: HTMLElement;
    lesson: HTMLElement;
    text: HTMLElement;
    guest: HTMLElement;
    episode?: HTMLElement;
    verify: HTMLElement;
    note?: HTMLElement;
    notice?: HTMLElement;
    link: HTMLAnchorElement;
  },
  id: StorefrontId,
): Claim | undefined {
  const list = claims ? claimsFor(claims, id) : [];
  const claim = list.find((c) => c.verified) ?? list[0];
  target.name.textContent = HEADLINES[id];
  target.lesson.textContent = LESSONS[id];
  target.text.textContent = claim ? `“${claim.quote}”` : "No claim mapped for this door yet.";
  const role = [claim?.role, claim?.company].filter((p) => p && p.length).join(" of ");
  target.guest.textContent = claim ? `${claim.guest}${role ? `, ${role}` : ""}` : "a Stabledash Live guest";
  if (target.episode) {
    target.episode.textContent = claim ? `${claim.episode}${claim.date ? ` · ${claim.date}` : ""}` : "";
  }
  const video = claim?.videoUrl ?? claims?.meta.episodeYoutube ?? "";
  if (video) {
    target.link.href = video;
    target.link.classList.remove("hidden");
  } else {
    target.link.classList.add("hidden");
  }
  if (claim?.verified) {
    target.verify.textContent = "On-air tape · verified";
    target.verify.classList.add("is-tape");
    target.verify.classList.remove("is-framing");
  } else {
    target.verify.textContent = "Positioning · confirm on air";
    target.verify.classList.add("is-framing");
    target.verify.classList.remove("is-tape");
  }
  if (target.note) {
    const extra = [claim?.note, claim?.clipNote].filter(Boolean).join(" · ");
    target.note.textContent = extra;
    target.note.classList.toggle("hidden", !extra);
  }
  if (target.notice) target.notice.textContent = "";
  return claim;
}

function openClaim(id: StorefrontId): void {
  beats.stop();
  claimKicker.textContent = `${storefrontName(id)} · you felt it`;
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
  setMode("claim");
}

function enterDoor(id: StorefrontId): void {
  if (mode === "beat" || mode === "arcade") return;
  walker?.exitLock();
  playSting(() => {
    if (id === "agent-pay-arcade") {
      startArcade();
      return;
    }
    beats.start(id as BeatKind);
    setMode("beat");
  });
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}

function startArcade(): void {
  arcade?.dispose();
  arcade = new SettlementRun();
  fitFov(arcade.camera, window.innerWidth / window.innerHeight);
  const best = bestGhostTime();
  arcadeGhost.textContent = best ? `Ghost ${formatClock(best)}` : "No ghost yet";
  arcadeHit.classList.add("hidden");
  hitShownAt = -1;
  setMode("arcade");
}

function paintArcadeResult(title: string, time: number | null): void {
  resultTime.textContent = time == null ? "DNF" : formatClock(time);
  const best = bestGhostTime();
  if (time != null && best != null && time <= best + 0.0001) resultGhost.textContent = "New ghost on this phone.";
  else if (best != null) resultGhost.textContent = `Best ghost ${formatClock(best)}`;
  else resultGhost.textContent = "No prior ghost.";
  const t = arcade?.tally ?? { fees: 0, delays: 0, clears: 0 };
  const fees = t.fees * 29;
  resultTally.innerHTML =
    time == null
      ? `Window closed before settlement. <strong>${t.delays}</strong> hold${t.delays === 1 ? "" : "s"}, <strong>${t.fees}</strong> card fee${t.fees === 1 ? "" : "s"}.`
      : `<strong>${t.clears}</strong> clean clear${t.clears === 1 ? "" : "s"} · <strong>${t.delays}</strong> hold${t.delays === 1 ? "" : "s"} · card fees <strong>$${fees}</strong> on a $1,000 send${
          t.fees === 0 && t.delays === 0 ? ". You stayed on the rail that clears." : "."
        }`;
  const claim = paintClaim(
    { name: resultTitle, lesson: resultLesson, text: resultClaim, guest: resultByline, verify: resultVerify, link: resultEpisodeLink },
    "agent-pay-arcade",
  );
  resultTitle.textContent = title;
  void claim;
}

function showArcadeResult(title: string, time: number | null): void {
  paintArcadeResult(title, time);
  setMode("arcade-result");
}

function toStreet(spawn?: THREE.Vector3, yaw = 0): void {
  if (!district || !walker) return;
  arcade?.dispose();
  arcade = null;
  beats.stop();
  walker.reset(spawn ?? district.spawn, yaw);
  setMode("street");
  if (!isCoarse()) walker.requestLock(canvas);
}

function returnToStreet(): void {
  toStreet(new THREE.Vector3(6.2, 1.65, 4.6), Math.PI);
}

function dropToStreet(): void {
  markOnboard();
  toStreet();
}

function startOnboard(): void {
  if (!district || !walker) return;
  if (seenOnboard() || reduceMotion()) {
    dropToStreet();
    return;
  }
  onboardStart = performance.now();
  onboardIndex = -1;
  walker.reset(district.spawn, district.spawnYaw);
  setMode("onboard");
}

function updateOnboard(dt: number): void {
  const t = (performance.now() - onboardStart) / 1000;
  let idx = 0;
  onboardBeats.forEach((b, i) => {
    if (t >= b.t) idx = i;
  });
  const beat = onboardBeats[idx];
  if (idx !== onboardIndex) {
    onboardIndex = idx;
    onboardKicker.textContent = beat.kicker;
    onboardLine.textContent = beat.line;
    onboardText.textContent = beat.text;
    if (onboardCard) {
      onboardCard.classList.remove("is-swap");
      void onboardCard.offsetWidth;
      onboardCard.classList.add("is-swap");
    }
  }
  camera.position.lerp(new THREE.Vector3(...beat.pos), 1 - Math.exp(-dt * 2.2));
  const look = new THREE.Vector3(...beat.look);
  const cur = new THREE.Vector3();
  camera.getWorldDirection(cur);
  const target = look.clone().sub(camera.position).normalize();
  cur.lerp(target, 1 - Math.exp(-dt * 3.2));
  camera.lookAt(camera.position.clone().add(cur));
  if (t >= ONBOARD_END) dropToStreet();
}

function bootDoor(): StorefrontId | null {
  const raw = new URLSearchParams(location.search).get("door");
  if (raw === "arcade" || raw === "agent-pay-arcade") return "agent-pay-arcade";
  if (raw === "stablecoin" || raw === "stablecoin-shop") return "stablecoin-shop";
  if (raw === "rails" || raw === "rails-station") return "rails-station";
  if (raw === "policy" || raw === "policy-desk") return "policy-desk";
  return null;
}

/* ---------- input ---------- */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let dragLook = false;
let dragX = 0;
let dragY = 0;
let dragMoved = false;

canvas.addEventListener("pointerdown", (e) => {
  if (mode !== "street" || e.button !== 0) return;
  dragLook = true;
  dragMoved = false;
  dragX = e.clientX;
  dragY = e.clientY;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    /* released */
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragLook || !walker || walker.locked) return;
  const dx = e.clientX - dragX;
  const dy = e.clientY - dragY;
  if (Math.hypot(dx, dy) > 3) dragMoved = true;
  walker.lookDelta(dx, dy);
  dragX = e.clientX;
  dragY = e.clientY;
});
canvas.addEventListener("pointerup", (e) => {
  if (mode !== "street" || !district || !walker) {
    dragLook = false;
    return;
  }
  const wasDrag = dragLook && dragMoved;
  dragLook = false;
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(district.doors.flatMap((d) => d.hit), false);
  const id = hits[0]?.object.userData.storefrontId as StorefrontId | undefined;
  if (id && !wasDrag) {
    enterDoor(id);
    return;
  }
  if (!wasDrag && !isCoarse()) walker.requestLock(canvas);
});

prompt.addEventListener("click", () => {
  if (activeDoor) enterDoor(activeDoor.id);
});
enterBtn.addEventListener("click", () => {
  startFilm();
  void stingVideo.load();
  const door = bootDoor();
  if (door) {
    markOnboard();
    if (district && walker) walker.reset(district.spawn, district.spawnYaw);
    enterDoor(door);
    return;
  }
  startOnboard();
});
onboardSkip.addEventListener("click", dropToStreet);
beatBack.addEventListener("click", () => toStreet(walker?.position.clone(), walker?.yaw ?? 0));
claimBack.addEventListener("click", () => toStreet(walker?.position.clone(), walker?.yaw ?? 0));
arcadeExit.addEventListener("click", () => {
  arcade?.abort();
  returnToStreet();
});
resultAgain.addEventListener("click", startArcade);
resultStreet.addEventListener("click", returnToStreet);
resultCopy.addEventListener("click", async () => {
  const text = `Settlement Run ${resultTime.textContent ?? ""} on the Stabledash block. ${location.origin}${location.pathname}?door=arcade`;
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
    if (mode === "onboard") dropToStreet();
    else if (mode === "beat" || mode === "claim") toStreet(walker?.position.clone(), walker?.yaw ?? 0);
    else if (mode === "arcade") {
      arcade?.abort();
      returnToStreet();
    } else if (mode === "arcade-result") returnToStreet();
  }
  if (mode === "arcade") {
    if (e.code === "KeyA" || e.code === "ArrowLeft") arcade?.shift(-1);
    if (e.code === "KeyD" || e.code === "ArrowRight") arcade?.shift(1);
  }
});

let stickTouch: number | null = null;
function stickFromEvent(e: PointerEvent): void {
  if (!walker) return;
  const rect = stick.getBoundingClientRect();
  const dx = e.clientX - (rect.left + rect.width / 2);
  const dy = e.clientY - (rect.top + rect.height / 2);
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
    arcade?.shift(e.clientX < window.innerWidth / 2 ? -1 : 1);
    return;
  }
  if (mode !== "street") return;
  if (isCoarse() && e.target instanceof Node && stick.contains(e.target)) {
    stickTouch = e.pointerId;
    try {
      stick.setPointerCapture(e.pointerId);
    } catch {
      /* released */
    }
    stickFromEvent(e);
  }
});
window.addEventListener("pointermove", (e) => {
  if (mode === "street" && e.pointerId === stickTouch) stickFromEvent(e);
});
function endPointer(e: PointerEvent): void {
  if (e.pointerId === stickTouch) {
    stickTouch = null;
    if (walker) {
      walker.stick.x = 0;
      walker.stick.z = 0;
    }
    stickKnob.style.transform = "";
  }
}
window.addEventListener("pointerup", endPointer);
window.addEventListener("pointercancel", endPointer);

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  fitFov(camera, w / h);
  if (arcade) fitFov(arcade.camera, w / h);
});

/* ---------- loop ---------- */
const doorIdle = new THREE.MeshStandardMaterial({ color: 0x11100e, emissive: palette.ivory, emissiveIntensity: 0.06, roughness: 0.4 });
const doorHot = new THREE.MeshStandardMaterial({ color: 0x11100e, emissive: palette.lime, emissiveIntensity: 0.22, roughness: 0.35 });

function tick(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  district?.update(dt, t);

  if (mode === "onboard") {
    updateOnboard(dt);
    renderer.render(streetScene, camera);
  } else if (mode === "street" && district && walker) {
    walker.update(dt, district.colliders);
    activeDoor = nearestDoor(district.doors, walker.position);
    if (activeDoor) {
      prompt.classList.remove("hidden");
      promptLabel.textContent = storefrontName(activeDoor.id);
      nearestEl.classList.add("hidden");
      activeDoor.mesh.material = doorHot;
      activeDoor.sign.material = activeDoor.signHot;
    } else {
      prompt.classList.add("hidden");
      nearestEl.classList.remove("hidden");
      nearestEl.textContent = "Walk to a lit marquee";
    }
    for (const door of district.doors) {
      if (door !== activeDoor) {
        door.mesh.material = doorIdle;
        door.sign.material = door.signIdle;
      }
    }
    lookHint.classList.toggle("hidden", isCoarse() || walker.locked);
    renderer.render(streetScene, camera);
  } else if (mode === "beat" || mode === "claim" || mode === "splash") {
    if (mode === "beat") beats.update(dt);
    renderer.render(streetScene, camera);
  } else if (mode === "arcade" && arcade) {
    const phase = arcade.update(dt);
    arcadeClock.textContent = `T+ ${formatClock(arcade.time)}`;
    const coach = arcade.coachLine();
    arcadeCoach.textContent = coach;
    arcadeCoach.classList.toggle("hidden", !coach);
    const hit = arcade.lastHit;
    if (hit && hit.at !== hitShownAt) {
      hitShownAt = hit.at;
      arcadeHit.textContent = hit.text;
      arcadeHit.classList.toggle("is-bad", hit.bad);
      arcadeHit.classList.remove("hidden");
    }
    if (hit && arcade.time - hit.at > 1.2) arcadeHit.classList.add("hidden");
    for (const el of arcadeLanes.querySelectorAll<HTMLElement>("[data-lane]")) {
      el.classList.toggle("is-hot", Number(el.dataset.lane) === arcade.laneIndex);
    }
    countdownEl.classList.toggle("hidden", arcade.phase !== "countdown");
    if (arcade.phase === "countdown") countdownEl.textContent = arcade.countdownLabel();
    renderer.render(arcade.scene, arcade.camera);
    if (phase === "won") showArcadeResult("SETTLED T+0", arcade.resultTime());
    else if (phase === "dnf") showArcadeResult("WINDOW CLOSED", null);
  } else if (mode === "arcade-result" && arcade) {
    renderer.render(arcade.scene, arcade.camera);
  } else {
    renderer.render(streetScene, camera);
  }
  requestAnimationFrame(tick);
}

/* ---------- boot ---------- */
async function boot(): Promise<void> {
  startFilm();
  enterBtn.disabled = true;
  enterBtn.textContent = "Loading the block…";
  await fontsReady();
  district = buildDistrict({ video: film });
  streetScene.add(district.group);
  walker = new Walker(camera);
  walker.reset(district.spawn, district.spawnYaw);
  walker.bind(canvas);
  enterBtn.disabled = false;
  enterBtn.textContent = "Enter the district";
  loadClaims()
    .then((file) => {
      claims = file;
      district?.setClaims(file.claims);
    })
    .catch((err: unknown) => console.error(err));
}

window.addEventListener("beforeunload", () => {
  arcade?.dispose();
  beats.stop();
});

setMode("splash");
void boot();
requestAnimationFrame(tick);
