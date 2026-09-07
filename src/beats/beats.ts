import { LESSONS, STOREFRONTS } from "../theme";
import type { StorefrontId } from "../types";

export type BeatKind = Exclude<StorefrontId, "agent-pay-arcade">;

export interface BeatController {
  start(id: BeatKind): void;
  update(dt: number): void;
  stop(): void;
  readonly active: BeatKind | null;
}

interface PegState {
  price: number;
  held: number;
  shockT: number;
  pending: boolean;
}

interface RailsState {
  seen: Set<string>;
}

interface PolicyState {
  phase: "idle" | "simulated" | "no-undo" | "cleared";
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
  let peg: PegState = { price: 1, held: 0, shockT: 0, pending: false };
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

  function pegBand(): "held" | "soft" | "break" {
    if (peg.price >= 0.99 && peg.price <= 1.01) return "held";
    if (peg.price < 0.96) return "break";
    return "soft";
  }

  function renderPeg(): void {
    const band = pegBand();
    root.stage.innerHTML = `
      <p class="beat-prompt">Redemptions hit. Keep one dollar.</p>
      <div class="peg-meter is-${band}">
        <span class="peg-label">USDC</span>
        <span class="peg-price">$${peg.price.toFixed(3)}</span>
        <span class="peg-target">Target $1.000 · ${peg.held}/3 waves held</span>
      </div>
      <div class="beat-actions">
        <button type="button" class="btn primary" data-act="defend">Defend with reserves</button>
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

  function resetPeg(message: string): void {
    peg = { price: 1, held: 0, shockT: 0, pending: false };
    root.status.textContent = message;
    renderPeg();
  }

  function onStageClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const act = target.closest<HTMLElement>("[data-act]")?.dataset.act;
    if (!act || !active) return;

    if (active === "stablecoin-shop" && act === "defend") {
      peg.price = Math.min(1.004, peg.price + 0.05);
      if (peg.pending && peg.price >= 0.99) {
        peg.pending = false;
        peg.held += 1;
        root.status.textContent = `Peg held. ${peg.held}/3 redemption waves.`;
      } else if (!peg.pending) {
        root.status.textContent = "Peg firm. Wait for the next redemption wave.";
      } else {
        root.status.textContent = "Still soft. Hit reserves again.";
      }
      renderPeg();
      maybeComplete(active, peg.held >= 3);
      return;
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
        maybeComplete(active, rails.seen.size >= 3);
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
      peg = { price: 1, held: 0, shockT: 1.2, pending: false };
      renderPeg();
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
    peg.price -= dt * 0.006;
    peg.shockT += dt;
    if (peg.shockT >= 5) {
      peg.shockT = 0;
      peg.pending = true;
      peg.price = Math.max(0.94, peg.price - 0.04);
      root.status.textContent = "Redemption wave. The peg slipped.";
    }
    if (peg.price < 0.92) {
      resetPeg("Depeg. No reserves, no dollar. Try again.");
      return;
    }
    const price = root.stage.querySelector(".peg-price");
    const meter = root.stage.querySelector(".peg-meter");
    const target = root.stage.querySelector(".peg-target");
    if (price) price.textContent = `$${peg.price.toFixed(3)}`;
    if (target) {
      target.textContent = `Target $1.000 · ${peg.held}/3 waves held`;
    }
    if (meter) {
      meter.classList.remove("is-held", "is-soft", "is-break");
      meter.classList.add(`is-${pegBand()}`);
    }
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
