import { LESSONS, STOREFRONTS } from "../theme";
import type { StorefrontId } from "../types";

export type BeatKind = Exclude<StorefrontId, "agent-pay-arcade">;

export interface BeatController {
  start(id: BeatKind): void;
  update(dt: number): void;
  stop(): void;
  readonly active: BeatKind | null;
}

interface StableState {
  minutes: number;
  bankTried: boolean;
  usdcOk: boolean;
}

interface RailsState {
  seen: Set<string>;
}

interface PolicyState {
  phase: "idle" | "simulated" | "no-undo" | "cleared";
}

const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function clockLabel(minutes: number): { day: string; time: string; weekend: boolean } {
  const dayIndex = Math.floor(minutes / (24 * 60)) % 7;
  const tod = minutes % (24 * 60);
  const h24 = Math.floor(tod / 60);
  const m = tod % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  const weekend = dayIndex <= 1;
  return {
    day: DAYS[dayIndex],
    time: `${h12}:${pad(m)} ${ampm} ET`,
    weekend,
  };
}

function bankOpen(minutes: number): boolean {
  const { weekend } = clockLabel(minutes);
  if (weekend) return false;
  const tod = minutes % (24 * 60);
  return tod >= 9 * 60 && tod < 17 * 60;
}

export function createBeats(root: {
  stage: HTMLElement;
  kicker: HTMLElement;
  title: HTMLElement;
  lede: HTMLElement;
  status: HTMLElement;
  onComplete: (id: BeatKind) => void;
}): BeatController {
  let active: BeatKind | null = null;
  let stable: StableState = { minutes: 2 * 60 + 14, bankTried: false, usdcOk: false };
  let rails: RailsState = { seen: new Set() };
  let policy: PolicyState = { phase: "idle" };
  let unbind: (() => void) | null = null;

  function paintChrome(id: BeatKind): void {
    const def = STOREFRONTS.find((s) => s.id === id);
    root.kicker.textContent = "Play the beat · then the guest line";
    root.title.textContent = def?.name ?? id;
    root.lede.textContent = def?.subtitle ?? "";
  }

  function maybeComplete(id: BeatKind, ready: boolean): void {
    if (!ready || active !== id) return;
    root.status.textContent = LESSONS[id];
    window.setTimeout(() => {
      if (active === id) root.onComplete(id);
    }, 700);
  }

  function renderStable(): void {
    const open = bankOpen(stable.minutes);
    const { day, time } = clockLabel(stable.minutes);
    root.stage.innerHTML = `
      <div class="beat-clock" data-act="skip-hours">
        <span class="beat-clock-day">${day}</span>
        <span class="beat-clock-time">${time}</span>
        <span class="beat-clock-win ${open ? "is-open" : "is-closed"}">${
          open ? "Bank window open" : "Bank window closed"
        }</span>
        <span class="beat-clock-hint">Tap the clock to skip hours</span>
      </div>
      <div class="beat-actions">
        <button type="button" class="btn" data-act="bank">Bank wire</button>
        <button type="button" class="btn primary" data-act="usdc">USDC rail</button>
      </div>
    `;
  }

  function renderRails(): void {
    root.stage.innerHTML = `
      <p class="beat-prompt">Vendor in Singapore. Saturday, 2am. They need it now.</p>
      <div class="beat-compare">
        <button type="button" class="rail-card ${rails.seen.has("ach") ? "is-seen" : ""}" data-act="ach">
          <strong>ACH</strong>
          <em>T+1 · cents</em>
        </button>
        <button type="button" class="rail-card ${rails.seen.has("cards") ? "is-seen" : ""}" data-act="cards">
          <strong>Cards</strong>
          <em>Instant · 2.9%</em>
        </button>
        <button type="button" class="rail-card ${rails.seen.has("usdc") ? "is-seen" : ""}" data-act="usdc">
          <strong>USDC</strong>
          <em>T+0 · pennies</em>
        </button>
      </div>
    `;
  }

  function renderPolicy(): void {
    const copy =
      policy.phase === "simulated"
        ? "Sim: this hits an unverified address. Do not send."
        : policy.phase === "no-undo"
          ? "Landed. Wrong destination. No recall desk. No undo."
          : policy.phase === "cleared"
            ? "Sim clear. Send is safe."
            : "5 USDC → vault.ops. Banks can recall. This rail cannot.";
    root.stage.innerHTML = `
      <p class="beat-prompt">${copy}</p>
      <div class="beat-actions">
        <button type="button" class="btn primary" data-act="sim" ${
          policy.phase === "no-undo" || policy.phase === "cleared" ? "disabled" : ""
        }>Simulate</button>
        <button type="button" class="btn" data-act="send" ${
          policy.phase === "no-undo" ? "disabled" : ""
        }>Send</button>
        <button type="button" class="btn ghost ${
          policy.phase === "no-undo" ? "" : "hidden"
        }" data-act="reset">Reset</button>
      </div>
    `;
  }

  function onStageClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const act = target.closest<HTMLElement>("[data-act]")?.dataset.act;
    if (!act || !active) return;

    if (active === "stablecoin-shop") {
      if (act === "skip-hours") {
        stable.minutes += 3 * 60;
        renderStable();
        return;
      }
      if (act === "bank") {
        stable.bankTried = true;
        if (bankOpen(stable.minutes)) {
          root.status.textContent = "Queued. T+1. Bank desk is awake — the rail still waits.";
        } else {
          root.status.textContent = "Bank closed. The dollar is awake. The wire is not.";
        }
        maybeComplete(active, stable.bankTried && stable.usdcOk);
        return;
      }
      if (act === "usdc") {
        stable.usdcOk = true;
        root.status.textContent = "Settled. T+0. The rail that does not sleep.";
        renderStable();
        maybeComplete(active, stable.bankTried && stable.usdcOk);
        return;
      }
    }

    if (active === "rails-station") {
      const lines: Record<string, string> = {
        ach: "Window closed. Lands Monday 9am. Cheap — and late.",
        cards: "Clears now. 2.9% + FX. Instant tax.",
        usdc: "Settled. T+0. The rail that does not sleep.",
      };
      if (lines[act]) {
        rails.seen.add(act);
        root.status.textContent = lines[act];
        renderRails();
        maybeComplete(active, rails.seen.has("usdc") && rails.seen.size >= 2);
      }
      return;
    }

    if (active === "policy-desk") {
      if (act === "reset") {
        policy.phase = "idle";
        root.status.textContent = "Replay. Simulate before you send.";
        renderPolicy();
        return;
      }
      if (act === "sim") {
        policy.phase = "simulated";
        root.status.textContent = "One simulation against chain state. Now you can see.";
        renderPolicy();
        return;
      }
      if (act === "send") {
        if (policy.phase === "simulated") {
          policy.phase = "cleared";
          root.status.textContent = LESSONS["policy-desk"];
          renderPolicy();
          maybeComplete(active, true);
        } else {
          policy.phase = "no-undo";
          root.status.textContent = "No undo button. Reset and simulate.";
          renderPolicy();
        }
      }
    }
  }

  function start(id: BeatKind): void {
    stop();
    active = id;
    paintChrome(id);
    root.status.textContent = "Do the move. The cite is the punchline.";
    if (id === "stablecoin-shop") {
      stable = { minutes: 2 * 60 + 14, bankTried: false, usdcOk: false };
      renderStable();
    } else if (id === "rails-station") {
      rails = { seen: new Set() };
      renderRails();
    } else {
      policy = { phase: "idle" };
      renderPolicy();
    }
    root.stage.addEventListener("click", onStageClick);
    unbind = () => root.stage.removeEventListener("click", onStageClick);
  }

  function update(dt: number): void {
    if (active !== "stablecoin-shop") return;
    stable.minutes += dt * 18;
    const clock = root.stage.querySelector(".beat-clock-time");
    const day = root.stage.querySelector(".beat-clock-day");
    const win = root.stage.querySelector(".beat-clock-win");
    if (!clock || !day || !win) return;
    const label = clockLabel(stable.minutes);
    const open = bankOpen(stable.minutes);
    day.textContent = label.day;
    clock.textContent = label.time;
    win.textContent = open ? "Bank window open" : "Bank window closed";
    win.classList.toggle("is-open", open);
    win.classList.toggle("is-closed", !open);
  }

  function stop(): void {
    unbind?.();
    unbind = null;
    active = null;
    root.stage.innerHTML = "";
  }

  return {
    start,
    update,
    stop,
    get active() {
      return active;
    },
  };
}
