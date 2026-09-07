import { primaryClaim } from "./claims";
import type { Claim, ClaimsFile, StorefrontId } from "./types";

export type BeatHandlers = {
  onComplete: () => void;
  onPlayArcade: () => void;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function pickClaim(
  claims: ClaimsFile | null,
  storefront: StorefrontId,
  prefer: string[],
): Claim | undefined {
  if (!claims) return undefined;
  const list = claims.claims.filter((c) => c.storefront === storefront);
  for (const id of prefer) {
    const hit = list.find((c) => c.id === id);
    if (hit) return hit;
  }
  return primaryClaim(claims, storefront);
}

export function rewardHtml(c: Claim | undefined, note?: string): string {
  if (!c) {
    return `<div class="reward"><p class="guest-said">Punchline</p><p class="beat-copy">No claim filed for this door yet.</p></div>`;
  }
  const role = c.role ? ` · ${escapeHtml(c.role)}` : "";
  const badge = c.verified
    ? `<span class="badge ok">Verified tape</span>`
    : `<span class="badge warn">Locked title · confirm on-air</span>`;
  const link = c.videoUrl
    ? `<a class="yt" href="${escapeHtml(c.videoUrl)}" target="_blank" rel="noopener noreferrer">Watch episode ↗</a>`
    : "";
  const extra = c.note
    ? `<p class="claim-note">${escapeHtml(c.note)}</p>`
    : "";
  return `<div class="reward">
    <p class="guest-said">You earned the line</p>
    <blockquote>“${escapeHtml(c.quote)}”</blockquote>
    <p class="byline">— ${escapeHtml(c.guest)} · ${escapeHtml(c.company)}${role}</p>
    <p class="episode"><span class="lbl">Episode</span> ${escapeHtml(c.episode)} · ${escapeHtml(c.date)}</p>
    <div class="claim-meta">${badge}${link}</div>
    ${extra}
    ${note ? `<p class="fine">${escapeHtml(note)}</p>` : ""}
  </div>`;
}

type Slot = { label: string; hour: number; bankOpen: boolean; hint: string };

const CLOCK_SLOTS: Slot[] = [
  { label: "Tue 2:10pm ET", hour: 14, bankOpen: true, hint: "Banking hours" },
  { label: "Sat 11:40pm ET", hour: 23, bankOpen: false, hint: "Weekend night" },
  { label: "Holiday noon", hour: 12, bankOpen: false, hint: "Fed holiday" },
];

function mountStablecoin(
  root: HTMLElement,
  claims: ClaimsFile | null,
  done: () => void,
): () => void {
  let i = 0;
  let triedClosed = false;
  let triedOpen = false;

  const paint = () => {
    const slot = CLOCK_SLOTS[i]!;
    const bank = slot.bankOpen;
    root.innerHTML = `
      <p class="beat-step">Beat ${i + 1} / ${CLOCK_SLOTS.length} · send $2,400 now</p>
      <div class="progress-pips">${CLOCK_SLOTS.map((_, n) => `<i class="${n <= i ? "on" : ""}"></i>`).join("")}</div>
      <p class="beat-copy">Clock the corridor. Which rail clears at <strong>${escapeHtml(slot.label)}</strong>?</p>
      <div class="beat-grid cols-2">
        <div class="slot-card ${bank ? "open" : "closed"}" id="bank-slot">
          <p class="slot-label">Bank ACH</p>
          <p class="slot-value">${bank ? "Open" : "Closed"}</p>
          <p class="slot-meta">${escapeHtml(slot.hint)}</p>
        </div>
        <div class="slot-card open" id="stable-slot">
          <p class="slot-label">Stablecoin rail</p>
          <p class="slot-value">24/7</p>
          <p class="slot-meta">Always clearing</p>
        </div>
      </div>
      <div class="row" id="choice-row">
        <button type="button" class="btn choice" data-pick="bank"><strong>Bank ACH</strong><span>Wait for open window</span></button>
        <button type="button" class="btn choice" data-pick="stable"><strong>Stablecoin</strong><span>Send now</span></button>
      </div>
      <p class="beat-result" id="beat-result"></p>
      <div id="reward-slot"></div>
    `;
    const result = root.querySelector("#beat-result") as HTMLElement;
    root.querySelectorAll("[data-pick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pick = (btn as HTMLElement).dataset.pick;
        root.querySelectorAll("[data-pick]").forEach((b) => b.setAttribute("disabled", "true"));
        if (pick === "bank") {
          if (bank) {
            result.textContent = "ACH batches — settles next banking day.";
            triedOpen = true;
            (btn as HTMLElement).classList.add("right");
          } else {
            result.textContent = "Window closed. ACH is asleep.";
            triedClosed = true;
            (btn as HTMLElement).classList.add("wrong");
          }
        } else {
          result.textContent = "Cleared on the dollar rail — night, weekend, holiday.";
          if (!bank) triedClosed = true;
          else triedOpen = true;
          (btn as HTMLElement).classList.add("right");
        }
        window.setTimeout(() => {
          if (i < CLOCK_SLOTS.length - 1) {
            i += 1;
            paint();
            return;
          }
          const reward = root.querySelector("#reward-slot")!;
          reward.innerHTML = rewardHtml(
            pickClaim(claims, "stablecoin", ["amias-24-7"]),
            "Dollars that move when banks don’t.",
          );
          done();
        }, 650);
      });
    });
  };
  paint();
  return () => {
    void triedClosed;
    void triedOpen;
  };
}

type Job = {
  need: string;
  best: "cards" | "ach" | "usdc";
  cards: string;
  ach: string;
  usdc: string;
};

const RAIL_JOBS: Job[] = [
  {
    need: "Pay a supplier $48k in under 10 minutes — B2B, no card network.",
    best: "usdc",
    cards: "Cards: merchant fees + B2B friction.",
    ach: "ACH: cheap, but not 10 minutes.",
    usdc: "On-chain dollar: clears when rails are up.",
  },
  {
    need: "Consumer checkout at a coffee shop — tap, points, chargeback cover.",
    best: "cards",
    cards: "Cards: built for this job.",
    ach: "ACH: wrong tool for the counter.",
    usdc: "On-chain: possible, not the default UX yet.",
  },
  {
    need: "Payroll to 200 W-2s next Friday — domestic, batch, low cost.",
    best: "ach",
    cards: "Cards: expensive for payroll.",
    ach: "ACH: the boring winner.",
    usdc: "On-chain: works, compliance stack still matters.",
  },
];

function mountRails(
  root: HTMLElement,
  claims: ClaimsFile | null,
  done: () => void,
): () => void {
  let i = 0;
  let score = 0;

  const paint = () => {
    const job = RAIL_JOBS[i]!;
    root.innerHTML = `
      <p class="beat-step">Job ${i + 1} / ${RAIL_JOBS.length} · pick the right rail</p>
      <div class="progress-pips">${RAIL_JOBS.map((_, n) => `<i class="${n <= i ? "on" : ""}"></i>`).join("")}</div>
      <p class="beat-copy">${escapeHtml(job.need)}</p>
      <div class="row">
        <button type="button" class="btn choice" data-pick="cards"><strong>Cards</strong><span>Consumer rails</span></button>
        <button type="button" class="btn choice" data-pick="ach"><strong>ACH</strong><span>Bank batch</span></button>
        <button type="button" class="btn choice" data-pick="usdc"><strong>USDC / on-chain</strong><span>Always-on dollar</span></button>
      </div>
      <p class="beat-result" id="beat-result"></p>
      <div id="reward-slot"></div>
    `;
    const result = root.querySelector("#beat-result") as HTMLElement;
    root.querySelectorAll("[data-pick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pick = (btn as HTMLElement).dataset.pick as Job["best"];
        root.querySelectorAll("[data-pick]").forEach((b) => b.setAttribute("disabled", "true"));
        const ok = pick === job.best;
        if (ok) score += 1;
        (btn as HTMLElement).classList.add(ok ? "right" : "wrong");
        result.textContent =
          pick === "cards" ? job.cards : pick === "ach" ? job.ach : job.usdc;
        window.setTimeout(() => {
          if (i < RAIL_JOBS.length - 1) {
            i += 1;
            paint();
            return;
          }
          const reward = root.querySelector("#reward-slot")!;
          reward.innerHTML = rewardHtml(
            pickClaim(claims, "rails", ["amias-boa", "santiago-idle-capital"]),
            `Different jobs. Different rails. (${score}/${RAIL_JOBS.length} matched)`,
          );
          done();
        }, 700);
      });
    });
  };
  paint();
  return () => undefined;
}

function mountPolicy(
  root: HTMLElement,
  claims: ClaimsFile | null,
  done: () => void,
): () => void {
  let peg = 100;
  let history: number[] = [100];
  let actions = 0;
  let undid = false;
  let rewarded = false;

  const paint = () => {
    const warn = peg < 92 || peg > 108;
    root.innerHTML = `
      <p class="beat-step">Sim desk · twist a knob · then undo</p>
      <p class="beat-copy">Run a settlement simulation. Watch the peg. Chain moves don’t come with a bank recall — practice undo here.</p>
      <div class="slot-card ${warn ? "closed" : "open"}">
        <p class="slot-label">Simulated peg</p>
        <p class="slot-value">${(peg / 100).toFixed(3)}</p>
        <div class="meter ${warn ? "warn" : ""}"><i style="width:${Math.max(8, Math.min(100, peg))}%"></i></div>
        <p class="slot-meta">History depth ${history.length} · actions ${actions}</p>
      </div>
      <div class="row">
        <button type="button" class="btn choice" data-act="mint"><strong>Mint pressure</strong><span>+supply shock</span></button>
        <button type="button" class="btn choice" data-act="pause"><strong>Pause redeem</strong><span>Liquidity freeze</span></button>
        <button type="button" class="btn choice" data-act="undo"><strong>Undo</strong><span>Bank-style recall</span></button>
      </div>
      <p class="beat-result" id="beat-result"></p>
      <div id="reward-slot"></div>
    `;
    const result = root.querySelector("#beat-result") as HTMLElement;
    root.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = (btn as HTMLElement).dataset.act;
        if (act === "mint") {
          history.push(peg);
          peg = Math.max(70, peg - 7);
          actions += 1;
          result.textContent = "Supply shock — peg softens. No automatic undo on-chain.";
        } else if (act === "pause") {
          history.push(peg);
          peg = Math.min(130, peg + 9);
          actions += 1;
          result.textContent = "Redemptions paused — premium spikes. Stress the corridor.";
        } else if (act === "undo") {
          if (history.length <= 1) {
            result.textContent = "Nothing to recall yet. Break it first.";
          } else {
            peg = history.pop()!;
            undid = true;
            result.textContent = "Undo applied — the bank move the chain doesn’t give you.";
          }
        }
        if (!rewarded && actions >= 2 && undid) {
          rewarded = true;
          paint();
          const reward = root.querySelector("#reward-slot")!;
          reward.innerHTML = rewardHtml(
            pickClaim(claims, "policy", ["nebojsa-undo", "nebojsa-sim"]),
            "Settlement can fail. Sim + undo is the discipline.",
          );
          done();
          return;
        }
        paint();
      });
    });
  };
  paint();
  return () => undefined;
}

function mountArcadeIntro(
  root: HTMLElement,
  _claims: ClaimsFile | null,
  onPlay: () => void,
): () => void {
  // Teach-then-reward: trailer + Start only. Claim punchline lands after Settlement Run.
  root.innerHTML = `
    <p class="beat-step">Shareable trailer · ~8s hook · ghost time</p>
    <p class="beat-copy">Agent Pay corridor. Three rails. Hazards are holds. Clears are T+0. Beat your ghost — that’s the X unit.</p>
    <div class="slot-card open">
      <p class="slot-label">Settlement Run</p>
      <p class="slot-value">T+0</p>
      <p class="slot-meta">Lane change · dodge ACH holds · finish gate</p>
    </div>
    <p class="fine" style="margin-top:12px">Play first — the guest line is the punchline after you settle.</p>
    <div class="row" style="margin-top:14px">
      <button type="button" class="btn primary" id="start-run">Start Settlement Run</button>
    </div>
  `;
  root.querySelector("#start-run")?.addEventListener("click", () => onPlay());
  return () => undefined;
}

const TITLES: Record<StorefrontId, { kicker: string; name: string }> = {
  stablecoin: { kicker: "24/7 dollar rails", name: "Stablecoin Shop" },
  rails: { kicker: "Cards · ACH · on-chain", name: "Rails Station" },
  policy: { kicker: "Sim · undo · fail", name: "Policy Desk" },
  arcade: { kicker: "Agent pay corridor", name: "Agent Pay Arcade" },
};

export function mountBeat(
  id: StorefrontId,
  root: HTMLElement,
  claims: ClaimsFile | null,
  handlers: BeatHandlers,
): () => void {
  root.innerHTML = "";
  if (id === "stablecoin") return mountStablecoin(root, claims, handlers.onComplete);
  if (id === "rails") return mountRails(root, claims, handlers.onComplete);
  if (id === "policy") return mountPolicy(root, claims, handlers.onComplete);
  return mountArcadeIntro(root, claims, handlers.onPlayArcade);
}

export function beatChrome(id: StorefrontId): { kicker: string; name: string } {
  return TITLES[id];
}
