import { Chip } from "./audio";
import { loadClaims } from "../claims";
import type { Claim, ClaimsFile, StorefrontId } from "../types";

/* ------------------------------------------------------------------ grid */
const COLS = 13;
const ROWS = 15;
const T = 16;
const W = COLS * T;
const H = ROWS * T;

// Row roles, top (0) to bottom (14)
const R = {
  header: 0,
  homes: 1,
  vendorWalk: 2,
  gate: 3,
  address: 4, // wrong-address manholes: no undo
  swift: 5, // correspondent vans: bounce back + $25
  fxWalk: 6,
  ach1: 7, // river rows: ACH barges (bank hours) OR the USDC express bridge (24/7)
  ach2: 8,
  ach3: 9,
  ach4: 10,
  kycWalk: 11,
  card2: 12,
  card1: 13,
  payerWalk: 14,
} as const;
const RIVER = [R.ach1, R.ach2, R.ach3, R.ach4] as number[];
const EXPRESS = 11; // the lime USDC bridge column

const HOME_COLS = [1, 3, 6, 9, 11];
const GATE_COLS = [2, 6, 10];

const PAL = {
  base: "#11100e",
  n900: "#1b1b18",
  n800: "#31302b",
  n700: "#41403a",
  ivory: "#f5f5f7",
  gray: "#a7a5a0",
  smoke: "#8b8b9e",
  lime: "#d0ea66",
  water: "#141418",
  wave: "#24242c",
} as const;

const PX = "'Press Start 2P', monospace";

/* ------------------------------------------------------------------ clock */
// Game minutes since Monday 00:00. Start Friday 4:55 PM.
const START_MIN = 4 * 1440 + 16 * 60 + 55;
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function clockLabel(min: number): string {
  const m = Math.floor(((min % (7 * 1440)) + 7 * 1440) % (7 * 1440));
  const day = DAYS[Math.floor(m / 1440)];
  const h24 = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  return `${day} ${h12}:${String(mm).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}
function bizHours(min: number): boolean {
  const m = ((min % (7 * 1440)) + 7 * 1440) % (7 * 1440);
  const day = Math.floor(m / 1440);
  const h = (m % 1440) / 60;
  return day < 5 && h >= 9 && h < 17;
}
function elapsedLabel(min: number): string {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  if (min < 1440) return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
  return `${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`;
}
function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ traffic */
interface Lane {
  row: number;
  kind: "card" | "ach" | "swift" | "puddle";
  dir: 1 | -1;
  speed: number; // tiles per second
  len: number; // tiles
  gap: number; // spacing between items in tiles
  xs: number[]; // left edge, in tiles (can be outside 0..COLS while wrapping)
}

function makeLane(row: number, kind: Lane["kind"], dir: 1 | -1, speed: number, len: number, count: number, phase: number): Lane {
  const span = COLS + len + 2;
  const gap = span / count;
  const xs: number[] = [];
  for (let i = 0; i < count; i++) xs.push(((i * gap + phase) % span) - len - 1);
  return { row, kind, dir, speed, len, gap, xs };
}

function laneWrap(lane: Lane): void {
  const span = COLS + lane.len + 2;
  for (let i = 0; i < lane.xs.length; i++) {
    let x = lane.xs[i];
    if (x > COLS + 1) x -= span;
    if (x < -lane.len - 1) x += span;
    lane.xs[i] = x;
  }
}

function laneHit(lane: Lane, px: number, tol = 0.35): number {
  // returns index of item overlapping player's centre tile, or -1
  for (let i = 0; i < lane.xs.length; i++) {
    const a = lane.xs[i];
    const b = a + lane.len;
    if (px + 0.5 > a + tol && px + 0.5 < b - tol) return i;
  }
  return -1;
}

/* ------------------------------------------------------------------ state */
type Phase = "attract" | "play" | "dying" | "clear" | "over";

interface Payment {
  amount: number;
  startMin: number;
  fees: number;
}

interface Stats {
  settled: number;
  settledAmount: number;
  fees: number;
  cardFees: number;
  swiftFees: number;
  depegLoss: number;
  waitedMin: number;
  deaths: Record<string, number>;
  rails: Record<string, number>;
}

interface HiScore {
  initials: string;
  score: number;
  settled: number;
  amount: number;
}

const HS_KEY = "mm-late-friday-hiscores-v1";

function loadHi(): HiScore[] {
  try {
    const raw = localStorage.getItem(HS_KEY);
    const list = raw ? (JSON.parse(raw) as HiScore[]) : [];
    return Array.isArray(list) ? list.slice(0, 8) : [];
  } catch {
    return [];
  }
}
function saveHi(list: HiScore[]): void {
  try {
    localStorage.setItem(HS_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ dom */
const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};
const canvas = $<HTMLCanvasElement>("gl");
const ctx2d = canvas.getContext("2d");
if (!ctx2d) throw new Error("2d context");
const ctx = ctx2d;
ctx.imageSmoothingEnabled = false;

const stage = $("stage");
const toast = $("toast");
const attract = $("attract");
const clearEl = $("clear");
const overEl = $("over");
const startBtn = $<HTMLButtonElement>("start");
const soundBtn = $<HTMLButtonElement>("sound");
const hudClock = $("hud-clock");
const hudAmount = $("hud-amount");
const hudLives = $("hud-lives");
const hudScore = $("hud-score");
const hudLevel = $("hud-level");
const hiList = $("hiscores");
const clearKicker = $("clear-kicker");
const clearHead = $("clear-head");
const clearGuest = $("clear-guest");
const clearVerify = $("clear-verify");
const clearQuote = $("clear-quote");
const clearEpisode = $("clear-episode");
const clearNext = $<HTMLButtonElement>("clear-next");
const clearWatch = $<HTMLAnchorElement>("clear-watch");
const receiptTitle = $("receipt-title");
const receiptDate = $("receipt-date");
const receiptLines = $("receipt-lines");
const receiptLesson = $("receipt-lesson");
const initialsBox = $("initials");
const letters = Array.from(document.querySelectorAll<HTMLButtonElement>(".letter"));
const saveBtn = $<HTMLButtonElement>("save-score");
const shareBtn = $<HTMLButtonElement>("share");
const againBtn = $<HTMLButtonElement>("again");
const pad = $("pad");
const film = $<HTMLVideoElement>("film");

const chip = new Chip();

/* ------------------------------------------------------------------ game */
class Game {
  phase: Phase = "attract";
  level = 1;
  lives = 3;
  score = 0;
  clock = START_MIN;
  lanes: Lane[] = [];
  homes: boolean[] = HOME_COLS.map(() => false);
  traps: number[] = [];
  gateT = 0;
  gateOpen = true;
  px = 6; // player col (float when riding)
  py: number = R.payerWalk;
  hopT = 0;
  fromX = 6;
  fromY: number = R.payerWalk;
  facing: "up" | "down" | "left" | "right" = "up";
  payment: Payment = { amount: 1000, startMin: START_MIN, fees: 0 };
  dyingT = 0;
  deathText = "";
  waiting = false;
  frame = 0;
  stats: Stats = this.freshStats();
  claims: ClaimsFile | null = null;
  usedClaims = new Set<string>();
  hi: HiScore[] = loadHi();
  lastRail = "";
  blink = 0;
  puddleY = 10;
  grace = 0;
  lastOpen = true;
  puddleDir: 1 | -1 = -1;
  puddleSpeed = 0.7;
  viaExpress = false;

  freshStats(): Stats {
    return { settled: 0, settledAmount: 0, fees: 0, cardFees: 0, swiftFees: 0, depegLoss: 0, waitedMin: 0, deaths: {}, rails: {} };
  }

  buildLevel(): void {
    const s = 1 + (this.level - 1) * 0.16;
    this.lanes = [
      makeLane(R.card1, "card", 1, 1.7 * s, 2, 2, 0.5),
      makeLane(R.card2, "card", -1, 2.2 * s, 1, 3, 2),
      makeLane(R.ach1, "ach", -1, 1.0 * s, 3, 3, 1),
      makeLane(R.ach2, "ach", 1, 1.4 * s, 4, 2, 3),
      makeLane(R.ach3, "ach", -1, 0.9 * s, 3, 3, 5),
      makeLane(R.ach4, "ach", 1, 1.2 * s, 3, 3, 2),
      makeLane(R.swift, "swift", 1, 1.7 * s, 2, 3, 1.5),
    ];
    this.puddleY = R.ach4;
    this.puddleDir = -1;
    this.puddleSpeed = 0.7 * s;
    const trapCount = Math.min(4, 1 + Math.floor(this.level / 2));
    const pool = this.level === 1 ? [4, 5, 7, 8, 9, 12] : [4, 5, 7, 8, 9, 10, 11, 12];
    this.traps = [];
    let seed = this.level * 7;
    while (this.traps.length < trapCount) {
      seed = (seed * 9301 + 49297) % 233280;
      const c = pool[seed % pool.length];
      if (!this.traps.includes(c)) this.traps.push(c);
    }
    this.homes = HOME_COLS.map(() => false);
    this.gateT = 0;
    this.gateOpen = true;
  }

  start(): void {
    chip.unlock();
    chip.start();
    this.level = 1;
    this.lives = 3;
    this.score = 0;
    this.clock = START_MIN;
    this.stats = this.freshStats();
    this.usedClaims.clear();
    this.buildLevel();
    this.spawn();
    this.phase = "play";
    showOverlay(null);
    updateHud(this);
  }

  spawn(): void {
    this.px = 6;
    this.py = R.payerWalk;
    this.fromX = 6;
    this.fromY = R.payerWalk;
    this.hopT = 0;
    this.facing = "up";
    this.payment = { amount: 1000, startMin: this.clock, fees: 0 };
    this.lastRail = "";
    this.waiting = false;
    this.grace = 0.7;
  }

  nextLevel(): void {
    this.level += 1;
    this.buildLevel();
    this.spawn();
    this.phase = "play";
    showOverlay(null);
    updateHud(this);
  }

  hop(dir: "up" | "down" | "left" | "right"): void {
    if (this.phase !== "play" || this.hopT > 0) return;
    const cx = Math.round(this.px);
    let nx = cx;
    let ny = this.py;
    if (dir === "up") ny -= 1;
    if (dir === "down") ny += 1;
    if (dir === "left") nx -= 1;
    if (dir === "right") nx += 1;
    this.facing = dir;
    if (nx < 0 || nx >= COLS || ny > R.payerWalk || ny < R.homes) return;
    // gate row: only open gate columns pass
    if (ny === R.gate) {
      if (!GATE_COLS.includes(nx) || !this.gateOpen) {
        flash("KYC HOLD · GATE CLOSED", true);
        chip.hold();
        return;
      }
    }
    // homes row: only slots, only unfilled
    if (ny === R.homes) {
      const idx = HOME_COLS.indexOf(nx);
      if (idx === -1) return;
      if (this.homes[idx]) {
        flash("ALREADY PAID", true);
        chip.hold();
        return;
      }
    }
    this.fromX = this.px;
    this.fromY = this.py;
    this.px = nx;
    this.py = ny;
    this.hopT = 0.09;
    chip.hop();
    this.onEnterRow(ny, this.fromY);
  }

  onEnterRow(row: number, prev: number): void {
    const isCard = (r: number) => r === R.card1 || r === R.card2;
    if (isCard(row) && !isCard(prev)) {
      const fee = this.payment.amount * 0.029;
      this.payment.amount -= fee;
      this.payment.fees += fee;
      this.stats.cardFees += fee;
      this.stats.fees += fee;
      flash(`INTERCHANGE  -2.9%  -${money(fee)}`, true);
      chip.fee();
      this.lastRail = "cards";
    }
    const col = Math.round(this.px);
    if (RIVER.includes(row) && !RIVER.includes(prev)) {
      // entering the river: which crossing?
      this.viaExpress = col === EXPRESS;
      if (this.viaExpress) {
        flash("USDC EXPRESS · OPEN 24/7 · T+0");
        this.score += 50;
      }
    }
    if (row === R.fxWalk && RIVER.includes(prev)) {
      this.lastRail = this.viaExpress ? "stablecoin" : "ach";
      if (this.viaExpress) {
        this.score += 100;
        flash("CLEARED ONCHAIN · +100");
      }
    }
    if (row === R.homes) this.settle(HOME_COLS.indexOf(col));
  }

  settle(idx: number): void {
    this.homes[idx] = true;
    const elapsed = this.clock - this.payment.startMin;
    const timeBonus = Math.max(0, Math.round(600 - elapsed));
    const pts = Math.round(this.payment.amount) + timeBonus + this.level * 100;
    this.score += pts;
    this.stats.settled += 1;
    this.stats.settledAmount += this.payment.amount;
    this.stats.rails[this.lastRail || "mixed"] = (this.stats.rails[this.lastRail || "mixed"] ?? 0) + 1;
    flash(`SETTLED ${money(this.payment.amount)} IN ${elapsedLabel(elapsed).toUpperCase()}  +${pts}`);
    chip.settle();
    updateHud(this);
    if (this.homes.every(Boolean)) {
      this.phase = "clear";
      chip.level();
      window.setTimeout(() => showClear(this), 700);
      return;
    }
    this.hopT = 0;
    window.setTimeout(() => {
      if (this.phase === "play") this.spawn();
    }, 400);
  }

  die(text: string, key: string): void {
    if (this.phase !== "play") return;
    this.phase = "dying";
    this.dyingT = 1.1;
    this.deathText = text;
    this.stats.deaths[key] = (this.stats.deaths[key] ?? 0) + 1;
    this.lives -= 1;
    chip.die();
    flash(text, true);
    updateHud(this);
  }

  bounce(): void {
    this.payment.amount = Math.max(0, this.payment.amount - 25);
    this.payment.fees += 25;
    this.stats.swiftFees += 25;
    this.stats.fees += 25;
    this.fromX = this.px;
    this.fromY = this.py;
    this.px = Math.round(this.px);
    this.py = R.fxWalk;
    this.hopT = 0.16;
    this.lastRail = "swift";
    flash("CORRESPONDENT BANK  -$25 · RE-ROUTED", true);
    chip.bounce();
    updateHud(this);
  }

  update(dt: number): void {
    this.frame += 1;
    this.blink += dt;
    if (this.phase === "attract") {
      this.clock += dt * 1; // idle drift keeps the attract clock alive
      for (const lane of this.lanes) this.advance(lane, dt, true);
      return;
    }
    if (this.phase === "dying") {
      this.dyingT -= dt;
      if (this.dyingT <= 0) {
        if (this.lives <= 0) {
          this.phase = "over";
          showOver(this);
        } else {
          this.spawn();
          this.phase = "play";
        }
      }
      return;
    }
    if (this.phase !== "play") return;

    // gate cycle
    this.gateT += dt;
    const cycle = Math.max(1.6, 3.2 - this.level * 0.2);
    this.gateOpen = this.gateT % (cycle * 2) < cycle * 1.15;

    // clock: 1 game minute per real second; the weekend fast-forwards while you wait on a frozen barge
    const open = bizHours(this.clock);
    const onRiver = RIVER.includes(this.py);
    const onBridge = onRiver && Math.round(this.px) === EXPRESS && Math.abs(this.px - EXPRESS) < 0.3;
    this.waiting = onRiver && !onBridge && !open;
    const rate = this.waiting ? 600 : 1;
    this.clock += dt * rate;
    if (this.waiting) this.stats.waitedMin += dt * rate;

    for (const lane of this.lanes) this.advance(lane, dt, open);

    // depeg puddle drifts up and down the express bridge
    this.puddleY += this.puddleDir * this.puddleSpeed * dt;
    if (this.puddleY <= R.ach1) { this.puddleY = R.ach1; this.puddleDir = 1; }
    if (this.puddleY >= R.ach4) { this.puddleY = R.ach4; this.puddleDir = -1; }

    if (this.hopT > 0) this.hopT = Math.max(0, this.hopT - dt);
    if (this.grace > 0) this.grace -= dt;

    // the 5:00 PM beat, and Monday's reopening
    if (this.lastOpen && !open) {
      flash("5:00 PM · ACH BATCH WINDOW CLOSED", true);
      chip.bounce();
    } else if (!this.lastOpen && open) {
      flash("MON 9:00 AM · ACH REOPENS");
      chip.settle();
    }
    this.lastOpen = open;

    if (onRiver) {
      if (onBridge) {
        if (this.hopT === 0 && Math.abs(this.puddleY - this.py) < 0.45) {
          const loss = this.payment.amount * 0.03;
          this.payment.amount -= loss;
          this.stats.depegLoss += loss;
          this.stats.fees += loss;
          this.fromX = this.px;
          this.fromY = this.py;
          this.py = Math.min(R.ach4 + 1, this.py + 1);
          if (this.py > R.ach4) this.py = R.kycWalk;
          this.hopT = 0.14;
          // send the puddle back to the far end so the bridge is fair again
          this.puddleY = R.ach1;
          this.puddleDir = 1;
          flash(`DEPEG · $0.97 · SLIPPED BACK  -${money(loss)}`, true);
          chip.fee();
        }
      } else {
        const lane = this.lanes.find((l) => l.row === this.py);
        if (lane) {
          const i = laneHit(lane, this.px, 0.15);
          if (i === -1) {
            if (this.hopT === 0) this.die("ACH RETURN · R01 · FELL IN THE BATCH", "ach");
          } else if (open) {
            this.px += lane.dir * lane.speed * dt;
            if (this.px < -0.5 || this.px > COLS - 0.5) this.die("LOST IN THE BATCH", "ach");
          }
        }
      }
    }

    // cards / swift collisions
    const lane = this.lanes.find((l) => l.row === this.py);
    if (lane && this.hopT === 0 && this.grace <= 0) {
      if (lane.kind === "card" && laneHit(lane, this.px, 0.2) !== -1) this.die("DECLINED · DO NOT HONOR", "cards");
      if (lane.kind === "swift" && laneHit(lane, this.px, 0.2) !== -1) this.bounce();
    }
    // wrong-address manholes
    if (this.py === R.address && this.hopT === 0 && this.traps.includes(Math.round(this.px))) {
      this.die("SENT TO 0x000…DEAD · NO UNDO", "address");
    }
    updateHud(this);
  }

  advance(lane: Lane, dt: number, open: boolean): void {
    if (lane.kind === "ach" && !open) return;
    for (let i = 0; i < lane.xs.length; i++) lane.xs[i] += lane.dir * lane.speed * dt;
    laneWrap(lane);
  }

  hiRank(): number {
    return this.hi.filter((h) => h.score >= this.score).length;
  }
}

/* ------------------------------------------------------------------ render */
function px(x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function text(s: string, x: number, y: number, c: string, size = 6, align: CanvasTextAlign = "left"): void {
  ctx.font = `${size}px ${PX}`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = c;
  ctx.fillText(s, Math.round(x), Math.round(y));
}

function drawRow(row: number, c: string): void {
  px(0, row * T, W, T, c);
}

function render(g: Game): void {
  ctx.setTransform(drawScale, 0, 0, drawScale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  px(0, 0, W, H, PAL.base);

  // header: skyline strip
  drawRow(R.header, PAL.base);
  for (let x = 0; x < W; x += 7) {
    const h = 4 + ((x * 13) % 9);
    px(x, T - h, 5, h, PAL.n900);
    if ((x * 7) % 5 === 0) px(x + 2, T - h + 2, 1, 1, PAL.gray);
  }
  text("SINGAPORE", 2, 3, PAL.smoke, 5);
  text(bizHours(g.clock) ? "BANKS OPEN" : "BANKS CLOSED", W - 2, 3, bizHours(g.clock) ? PAL.lime : PAL.smoke, 5, "right");

  // homes
  drawRow(R.homes, PAL.n900);
  for (let c = 0; c < COLS; c++) {
    if (!HOME_COLS.includes(c)) px(c * T, R.homes * T, T, T, PAL.n800);
  }
  HOME_COLS.forEach((c, i) => {
    const x = c * T;
    const y = R.homes * T;
    px(x, y, T, T, PAL.base);
    if (g.homes[i]) {
      px(x + 1, y + 1, T - 2, T - 2, PAL.lime);
      text("$", x + T / 2, y + 5, PAL.base, 6, "center");
    } else {
      // a little storefront: striped awning, dark door, lit window
      px(x + 1, y + 1, T - 2, 4, PAL.ivory);
      for (let k = 1; k < T - 2; k += 4) px(x + k, y + 1, 2, 4, PAL.gray);
      px(x + 1, y + 5, T - 2, T - 6, PAL.n900);
      px(x + 3, y + 7, 4, 4, "rgba(245,245,247,0.5)");
      px(x + 9, y + 7, 4, T - 8, PAL.base);
      px(x + 1, y + T - 2, T - 2, 1, PAL.ivory);
    }
  });

  // walks
  for (const r of [R.vendorWalk, R.fxWalk, R.kycWalk, R.payerWalk]) {
    drawRow(r, PAL.n800);
    for (let x = 0; x < W; x += T) px(x, r * T, 1, T, PAL.n700);
    px(0, r * T, W, 1, PAL.n700);
  }
  text("VENDOR · SG", 2, R.vendorWalk * T + 5, PAL.gray, 5);
  text("FX DESK", 2, R.fxWalk * T + 5, PAL.gray, 5);
  text("KYC DESK", 2, R.kycWalk * T + 5, PAL.gray, 5);
  text("PAYER · NYC", 2, R.payerWalk * T + 5, PAL.gray, 5);
  text("$1,000", W - 2, R.payerWalk * T + 5, PAL.lime, 5, "right");

  // gate wall
  drawRow(R.gate, PAL.n700);
  for (let c = 0; c < COLS; c++) {
    const x = c * T;
    const y = R.gate * T;
    if (GATE_COLS.includes(c)) {
      px(x, y, T, T, PAL.base);
      if (g.gateOpen) {
        px(x + 1, y + 2, 2, T - 4, PAL.lime);
        px(x + T - 3, y + 2, 2, T - 4, PAL.lime);
      } else {
        for (let k = 3; k < T; k += 4) px(x + 1, y + k, T - 2, 1, PAL.smoke);
        px(x + 1, y + 2, 2, T - 4, PAL.smoke);
        px(x + T - 3, y + 2, 2, T - 4, PAL.smoke);
      }
    } else {
      px(x + 1, y + 1, T - 2, 6, PAL.n800);
      px(x + 1, y + 9, T - 2, 6, PAL.n800);
    }
  }
  text(g.gateOpen ? "KYC OPEN" : "KYC HOLD", 8 * T, R.gate * T + 5, g.gateOpen ? PAL.lime : PAL.smoke, 5, "center");

  // address row: manholes you must read before you step
  drawRow(R.address, PAL.n900);
  for (let x = 0; x < W; x += 4) px(x, R.address * T + T - 1, 2, 1, PAL.n700);
  text("CHECK ADDR", 2, R.address * T + 5, PAL.smoke, 5);
  for (const c of g.traps) {
    const x = c * T;
    const y = R.address * T;
    px(x + 2, y + 2, T - 4, T - 4, "#0b0b0a");
    px(x + 3, y + 3, T - 6, 1, PAL.n700);
    text("0x?", x + T / 2, y + 5, PAL.smoke, 5, "center");
  }

  // swift lane
  drawRow(R.swift, PAL.n900);
  for (let x = 0; x < W; x += 6) px(x, R.swift * T + T - 1, 3, 1, PAL.n700);
  text("SWIFT", 2, R.swift * T + 5, PAL.smoke, 5);

  // ach river + the USDC express bridge
  const open = bizHours(g.clock);
  for (const r of RIVER) {
    drawRow(r, PAL.water);
    for (let x = 0; x < W; x += 12) {
      const wob = open ? Math.sin(g.frame / 14 + x + r) * 1 : 0;
      px(x + ((r * 5) % 12), r * T + 6 + wob, 6, 1, PAL.wave);
    }
  }
  text(open ? "ACH · BATCHING" : "ACH · CLOSED TIL MON 9AM", 2, R.ach2 * T + 5, open ? PAL.gray : PAL.smoke, 5);
  {
    const bx = EXPRESS * T;
    px(bx, R.ach1 * T, T, RIVER.length * T, PAL.n900);
    const off = (g.frame * 0.6) % 8;
    for (let y = R.ach1 * T - 8 + off; y < (R.ach4 + 1) * T; y += 8) px(bx + T / 2 - 1, y, 2, 4, PAL.lime);
    px(bx, R.ach1 * T, 1, RIVER.length * T, "#3a4222");
    px(bx + T - 1, R.ach1 * T, 1, RIVER.length * T, "#3a4222");
    text("U", bx + 2, R.ach1 * T + 3, PAL.lime, 5);
    text("S", bx + 2, R.ach2 * T + 3, PAL.lime, 5);
    text("D", bx + 2, R.ach3 * T + 3, PAL.lime, 5);
    text("C", bx + 2, R.ach4 * T + 3, PAL.lime, 5);
    // the depeg puddle riding the bridge
    const py2 = g.puddleY * T;
    px(bx + 1, py2 + 3, T - 2, T - 6, "rgba(139,139,158,0.7)");
    text(".97", bx + T / 2, py2 + 6, PAL.base, 4, "center");
  }
  text("24/7", EXPRESS * T + T / 2, R.kycWalk * T + 5, PAL.lime, 5, "center");

  // cards lanes
  for (const r of [R.card1, R.card2]) {
    drawRow(r, PAL.n900);
    for (let x = 0; x < W; x += 6) px(x, r * T, 3, 1, PAL.n700);
  }
  text("CARDS · 2.9%", 2, R.card1 * T + 5, PAL.smoke, 5);

  // lane items
  for (const lane of g.lanes) {
    for (const lx of lane.xs) {
      const x = lx * T;
      const y = lane.row * T;
      const w = lane.len * T;
      if (lane.kind === "card") {
        px(x + 1, y + 3, w - 2, T - 6, PAL.ivory);
        px(x + 3, y + 5, w - 6, 3, PAL.n800);
        px(x + 2, y + T - 4, 3, 2, PAL.base);
        px(x + w - 5, y + T - 4, 3, 2, PAL.base);
        if (w >= T * 2) text("DECLINE", x + w / 2, y + 9, PAL.base, 4, "center");
      } else if (lane.kind === "ach") {
        px(x + 1, y + 2, w - 2, T - 4, PAL.n700);
        px(x + 1, y + 2, w - 2, 1, PAL.gray);
        text(open ? "BATCH" : "HELD", x + w / 2, y + 6, PAL.ivory, 4, "center");
      } else if (lane.kind === "swift") {
        px(x + 1, y + 3, w - 2, T - 6, PAL.gray);
        px(x + 2, y + 5, 5, 3, PAL.base);
        text("CORR", x + w / 2 + 3, y + 8, PAL.base, 4, "center");
      }
    }
  }

  // player: the $1,000 bill
  if (g.phase !== "over") {
    const t = g.hopT > 0 ? 1 - g.hopT / 0.09 : 1;
    const ix = g.hopT > 0 ? g.fromX + (g.px - g.fromX) * Math.min(1, t) : g.px;
    const iy = g.hopT > 0 ? g.fromY + (g.py - g.fromY) * Math.min(1, t) : g.py;
    const x = ix * T;
    const y = iy * T;
    const lift = g.hopT > 0 ? Math.sin(Math.min(1, t) * Math.PI) * 3 : 0;
    if (g.phase === "dying") {
      const k = Math.floor(g.dyingT * 12) % 2 === 0;
      if (k) {
        px(x + 2, y + 4, T - 4, T - 8, PAL.smoke);
        text("X", x + T / 2, y + 6, PAL.base, 6, "center");
      }
    } else {
      px(x + 1, y + 3 - lift, T - 2, T - 6, PAL.lime);
      px(x + 3, y + 5 - lift, T - 6, T - 10, "#b9d34f");
      text("$", x + T / 2, y + 5 - lift, PAL.base, 6, "center");
      // shadow
      if (lift > 0) px(x + 3, y + T - 2, T - 6, 1, "rgba(0,0,0,0.5)");
    }
  }

  // waiting overlay
  if (g.waiting) {
    px(0, H / 2 - 14, W, 28, "rgba(17,16,14,0.88)");
    text("BATCH WINDOW CLOSED", W / 2, H / 2 - 9, PAL.ivory, 6, "center");
    text("WAITING FOR MONDAY 9AM…", W / 2, H / 2 + 2, PAL.smoke, 5, "center");
  }
  if (g.phase === "dying") {
    px(0, H / 2 - 12, W, 24, "rgba(17,16,14,0.9)");
    text(g.deathText, W / 2, H / 2 - 4, PAL.ivory, 5, "center");
  }
}

/* ------------------------------------------------------------------ ui */
let toastTimer = 0;
function flash(msg: string, bad = false): void {
  toast.textContent = msg;
  toast.classList.toggle("bad", bad);
  toast.classList.remove("hidden");
  // restart animation
  toast.style.animation = "none";
  void toast.offsetWidth;
  toast.style.animation = "";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.add("hidden"), 1400);
}

function updateHud(g: Game): void {
  hudClock.textContent = clockLabel(g.clock);
  hudAmount.textContent = money(g.payment.amount);
  hudLives.textContent = g.lives > 0 ? Array.from({ length: g.lives }, () => "$").join(" ") : "—";
  hudScore.textContent = String(g.score);
  hudLevel.textContent = String(g.level);
}

function showOverlay(el: HTMLElement | null): void {
  for (const o of [attract, clearEl, overEl]) o.classList.toggle("hidden", o !== el);
  film.style.opacity = el === attract ? "1" : "0";
}

function renderHi(list: HiScore[]): void {
  hiList.innerHTML = "";
  const hdr = document.createElement("li");
  hdr.className = "hdr";
  hdr.innerHTML = "<span>#</span><span>WHO</span><span>SCORE</span><span class='amt'>SETTLED</span>";
  hiList.appendChild(hdr);
  const rows = list.length ? list : [{ initials: "---", score: 0, settled: 0, amount: 0 }];
  rows.slice(0, 6).forEach((h, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${i + 1}</span><span>${h.initials}</span><span>${h.score}</span><span class="amt">${h.settled ? money(h.amount) : "—"}</span>`;
    hiList.appendChild(li);
  });
}

const LEVEL_DOOR: StorefrontId[] = ["rails-station", "stablecoin-shop", "policy-desk", "agent-pay-arcade"];
const KEY: Record<StorefrontId, string> = {
  "rails-station": "rails",
  "stablecoin-shop": "stablecoin",
  "policy-desk": "policy",
  "agent-pay-arcade": "arcade",
};

function pickClaim(g: Game): Claim | null {
  if (!g.claims) return null;
  const door = LEVEL_DOOR[(g.level - 1) % LEVEL_DOOR.length];
  const pool = g.claims.claims.filter((c) => c.storefront === KEY[door]);
  const fresh = pool.filter((c) => !g.usedClaims.has(c.id));
  const list = (fresh.length ? fresh : pool).sort((a, b) => Number(b.verified) - Number(a.verified));
  const c = list[0] ?? null;
  if (c) g.usedClaims.add(c.id);
  return c;
}

function showClear(g: Game): void {
  const c = pickClaim(g);
  clearKicker.textContent = `Level ${g.level} clear · guest said`;
  clearHead.textContent = g.level === 1 ? "FIVE VENDORS PAID BEFORE MONDAY" : g.level === 2 ? "THE PEG HELD. MOSTLY." : g.level === 3 ? "NO RECALL DESK ON THIS RAIL" : "AGENTS PAY AGENTS NOW";
  if (c) {
    const role = [c.role, c.company].filter(Boolean).join(" of ");
    clearGuest.textContent = `${c.guest}${role ? `, ${role}` : ""}`;
    clearVerify.textContent = c.verified ? "On-air tape · verified" : "Positioning · confirm on air";
    clearVerify.classList.toggle("is-tape", c.verified);
    clearQuote.textContent = `“${c.quote}”`;
    clearEpisode.textContent = `${c.episode}${c.date ? ` · ${c.date}` : ""}`;
    const url = c.videoUrl ?? g.claims?.meta.episodeYoutube ?? "";
    clearWatch.href = url;
    clearWatch.classList.toggle("hidden", !url);
  } else {
    clearGuest.textContent = "a Stabledash Live guest";
    clearVerify.textContent = "";
    clearQuote.textContent = "“Claims are loading…”";
    clearEpisode.textContent = "";
    clearWatch.classList.add("hidden");
  }
  showOverlay(clearEl);
  clearNext.focus();
}

let initials = ["A", "A", "A"];
let activeLetter = 0;
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function paintLetters(): void {
  letters.forEach((b, i) => {
    b.textContent = initials[i];
    b.classList.toggle("is-active", i === activeLetter);
  });
}

function receiptLesson_(g: Game): string {
  const s = g.stats;
  if (s.settled === 0) return "Nothing settled. Friday won. Try the lime rail: it is open when the banks are not.";
  const stable = s.rails.stablecoin ?? 0;
  if (s.waitedMin > 600) return `You spent ${elapsedLabel(s.waitedMin)} waiting on the ACH batch. The stablecoin rail was open the whole time.`;
  if (s.cardFees > 40) return `Cards got you there fast and took ${money(s.cardFees)} for it. That is the 2.9% everyone stops noticing.`;
  if (stable >= Math.max(1, s.settled - 1)) return "Mostly settled on the stablecoin rail: T+0, pennies, no weekend. That is the whole show in one receipt.";
  return "Three rails, three trade-offs: speed, fees, hours. You just felt all of them.";
}

function receiptText(g: Game): string {
  const s = g.stats;
  return [
    `LATE FRIDAY · settlement receipt`,
    `${s.settled} payment${s.settled === 1 ? "" : "s"} settled · ${money(s.settledAmount)} arrived`,
    `Card fees ${money(s.cardFees)} · SWIFT fees ${money(s.swiftFees)} · depeg ${money(s.depegLoss)}`,
    s.waitedMin > 0 ? `Waited ${elapsedLabel(s.waitedMin)} on ACH` : `Never waited on ACH`,
    `Score ${g.score} · level ${g.level}`,
    receiptLesson_(g),
    `Play: ${location.origin}${location.pathname}`,
  ].join("\n");
}

function showOver(g: Game): void {
  const s = g.stats;
  receiptTitle.textContent = s.settled ? `${s.settled} PAID · ${money(s.settledAmount)}` : "GAME OVER";
  receiptDate.textContent = clockLabel(g.clock);
  const deathLabel: Record<string, string> = { cards: "declined", ach: "fell in the batch", address: "wrong address" };
  const deaths = Object.entries(s.deaths).map(([k, v]) => `${v} ${deathLabel[k] ?? k}`).join(", ");
  const lines: Array<[string, string, boolean?]> = [
    ["Payments settled", String(s.settled)],
    ["Amount arrived", money(s.settledAmount), true],
    ["Card interchange", `-${money(s.cardFees)}`],
    ["Correspondent fees", `-${money(s.swiftFees)}`],
    ["Depeg slippage", `-${money(s.depegLoss)}`],
    ["Time waiting on ACH", s.waitedMin ? elapsedLabel(s.waitedMin) : "none"],
    ["Payments lost", deaths || "none"],
    ["Score", String(g.score), true],
  ];
  receiptLines.innerHTML = lines
    .map(([k, v, lime]) => `<dt>${k}</dt><dd class="${lime ? "lime" : ""}">${v}</dd>`)
    .join("");
  receiptLesson.textContent = receiptLesson_(g);
  const qualifies = g.score > 0 && (g.hi.length < 8 || g.score > g.hi[g.hi.length - 1].score);
  initialsBox.classList.toggle("hidden", !qualifies);
  activeLetter = 0;
  paintLetters();
  showOverlay(overEl);
}

/* ------------------------------------------------------------------ input */
const game = new Game();
game.buildLevel();
(window as unknown as { __lateFriday: Game }).__lateFriday = game;

function dirFromKey(code: string): "up" | "down" | "left" | "right" | null {
  if (code === "ArrowUp" || code === "KeyW") return "up";
  if (code === "ArrowDown" || code === "KeyS") return "down";
  if (code === "ArrowLeft" || code === "KeyA") return "left";
  if (code === "ArrowRight" || code === "KeyD") return "right";
  return null;
}

window.addEventListener("keydown", (e) => {
  const dir = dirFromKey(e.code);
  if (game.phase === "attract" && (e.code === "Enter" || e.code === "Space" || dir)) {
    e.preventDefault();
    game.start();
    return;
  }
  if (game.phase === "clear" && (e.code === "Enter" || e.code === "Space")) {
    e.preventDefault();
    game.nextLevel();
    return;
  }
  if (game.phase === "over" && !initialsBox.classList.contains("hidden")) {
    if (dir === "up" || dir === "down") {
      e.preventDefault();
      const i = ALPHA.indexOf(initials[activeLetter]);
      initials[activeLetter] = ALPHA[(i + (dir === "up" ? 1 : ALPHA.length - 1)) % ALPHA.length];
      paintLetters();
      chip.tick();
    } else if (dir === "left" || dir === "right") {
      e.preventDefault();
      activeLetter = (activeLetter + (dir === "right" ? 1 : 2)) % 3;
      paintLetters();
    } else if (e.code === "Enter") {
      saveBtn.click();
    }
    return;
  }
  if (game.phase === "over" && (e.code === "Enter" || e.code === "Space")) {
    againBtn.click();
    return;
  }
  if (dir) {
    e.preventDefault();
    game.hop(dir);
  }
});

// swipe / tap on the stage
let touchStart: { x: number; y: number; t: number } | null = null;
stage.addEventListener("pointerdown", (e) => {
  if ((e.target as Element).closest("button, a, .overlay")) return;
  touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
});
stage.addEventListener("pointerup", (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;
  touchStart = null;
  if ((e.target as Element).closest("button, a, .overlay")) return;
  if (Math.hypot(dx, dy) < 14) {
    // tap: hop toward the tapped side relative to the player
    const rect = canvas.getBoundingClientRect();
    const tx = ((e.clientX - rect.left) / rect.width) * COLS;
    const ty = ((e.clientY - rect.top) / rect.height) * ROWS;
    const ddx = tx - (game.px + 0.5);
    const ddy = ty - (game.py + 0.5);
    if (Math.abs(ddx) > Math.abs(ddy) && Math.abs(ddx) > 0.8) game.hop(ddx > 0 ? "right" : "left");
    else game.hop(ddy > 0 ? "down" : "up");
    return;
  }
  if (Math.abs(dx) > Math.abs(dy)) game.hop(dx > 0 ? "right" : "left");
  else game.hop(dy > 0 ? "down" : "up");
});

pad.addEventListener("pointerdown", (e) => {
  const b = (e.target as Element).closest<HTMLElement>("[data-dir]");
  if (!b) return;
  e.preventDefault();
  game.hop(b.dataset.dir as "up");
});

startBtn.addEventListener("click", () => game.start());
clearNext.addEventListener("click", () => game.nextLevel());
againBtn.addEventListener("click", () => game.start());
soundBtn.addEventListener("click", () => {
  chip.unlock();
  chip.enabled = !chip.enabled;
  soundBtn.textContent = chip.enabled ? "Sound on" : "Sound off";
  soundBtn.setAttribute("aria-pressed", String(chip.enabled));
  if (chip.enabled) chip.tick();
});
letters.forEach((b) => {
  b.addEventListener("click", () => {
    const i = Number(b.dataset.i);
    if (i === activeLetter) {
      const k = ALPHA.indexOf(initials[i]);
      initials[i] = ALPHA[(k + 1) % ALPHA.length];
      chip.tick();
    } else activeLetter = i;
    paintLetters();
  });
});
saveBtn.addEventListener("click", () => {
  const entry: HiScore = { initials: initials.join(""), score: game.score, settled: game.stats.settled, amount: game.stats.settledAmount };
  game.hi = [...game.hi, entry].sort((a, b) => b.score - a.score).slice(0, 8);
  saveHi(game.hi);
  renderHi(game.hi);
  initialsBox.classList.add("hidden");
  chip.settle();
});
shareBtn.addEventListener("click", async () => {
  const txt = receiptText(game);
  try {
    if (navigator.share) {
      await navigator.share({ title: "Late Friday · settlement receipt", text: txt });
      return;
    }
    await navigator.clipboard.writeText(txt);
    shareBtn.textContent = "Receipt copied";
  } catch {
    shareBtn.textContent = "Copy failed";
  }
});

// keep the arrow keys from scrolling the page and stop double-tap zoom
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

/* ------------------------------------------------------------------ sizing */
let drawScale = 1;
function fit(): void {
  const rect = stage.getBoundingClientRect();
  const css = Math.max(1, Math.min((rect.width - 8) / W, (rect.height - 8) / H));
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  drawScale = Math.max(1, Math.round(css * dpr));
  canvas.width = W * drawScale;
  canvas.height = H * drawScale;
  canvas.style.setProperty("--w", `${Math.floor(W * css)}px`);
  canvas.style.setProperty("--h", `${Math.floor(H * css)}px`);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", fit);
new ResizeObserver(fit).observe(stage);

/* ------------------------------------------------------------------ loop */
let last = performance.now();
function tick(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  render(game);
  requestAnimationFrame(tick);
}

async function boot(): Promise<void> {
  try {
    await Promise.race([document.fonts.load(`6px ${PX}`), new Promise((r) => window.setTimeout(r, 1800))]);
  } catch {
    /* fallback font */
  }
  renderHi(game.hi);
  updateHud(game);
  fit();
  showOverlay(attract);
  void film.play().catch(() => undefined);
  loadClaims()
    .then((f) => {
      game.claims = f;
    })
    .catch((err: unknown) => console.error(err));
  requestAnimationFrame(tick);
}
void boot();
