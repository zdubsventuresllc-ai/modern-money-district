import type { StorefrontDef } from "./types";

/**
 * Stabledash Live tokens (brand-guidelines-llm + design brief).
 * Base black #11100e, neutral-900 #1b1b18, neutral-800 #31302b, neutral-700 #41403a,
 * ivory text, smoke secondary, and ONE accent: broadcast chartreuse #d0ea66.
 * The look is the Live intro: monochrome archival film, grain, one practical per door.
 */
export const palette = {
  midnight: 0x11100e,
  midnightHex: "#11100e",
  charcoal: 0x1b1b18,
  charcoalHex: "#1b1b18",
  neutral800: 0x31302b,
  neutral700: 0x41403a,
  ivory: 0xf5f5f7,
  ivoryHex: "#f5f5f7",
  gray: 0xa7a5a0,
  grayHex: "#a7a5a0",
  smoke: 0x8b8b9e,
  smokeHex: "#8b8b9e",
  lime: 0xd0ea66,
  limeHex: "#d0ea66",
  ink: 0x11100e,
  inkHex: "#11100e",
  asphalt: 0x15151a,
  sidewalk: 0x2b2b27,
  slate: 0x31302b,
  danger: 0x8b8b9e,
  ok: 0xd0ea66,
  cream: 0xf5f5f7,
  creamHex: "#f5f5f7",
} as const;

export const SPONSORS = [
  "Dfns",
  "Dakota",
  "Breeze",
  "HopNow",
  "Agora",
  "Altitude",
  "Artemis",
  "Kast",
  "Coast",
  "Movement",
] as const;

/** Studio-banner style sponsor lines (headline caps + one-line text). */
export const SPONSOR_LINES: Record<(typeof SPONSORS)[number], string> = {
  Dfns: "The core banking platform for digital assets",
  Dakota: "Powers the NEO segment",
  Breeze: "Live night partner",
  HopNow: "Research desk partner",
  Agora: "Live night partner",
  Altitude: "Founding partner, Stableminded: The Frontier",
  Artemis: "Live night partner",
  Kast: "Live night partner",
  Coast: "Live night partner",
  Movement: "Presents MoveMe Live Debates",
};

export const STOREFRONTS: StorefrontDef[] = [
  {
    id: "stablecoin-shop",
    name: "Stablecoin Shop",
    subtitle: "Hold the peg",
    x: -6.2,
    z: -8.4,
    facing: 1,
  },
  {
    id: "rails-station",
    name: "Rails Station",
    subtitle: "ACH · Cards · USDC",
    x: 6.2,
    z: -8.4,
    facing: 1,
  },
  {
    id: "policy-desk",
    name: "Policy Desk",
    subtitle: "Simulate / no undo",
    x: -6.2,
    z: 8.4,
    facing: -1,
  },
  {
    id: "agent-pay-arcade",
    name: "Agent Pay Arcade",
    subtitle: "Settlement Run",
    x: 6.2,
    z: 8.4,
    facing: -1,
  },
];

/** Marquee copy: short uppercase, stacked like a theater marquee. */
export const MARQUEE: Record<StorefrontDef["id"], [string, string]> = {
  "stablecoin-shop": ["STABLECOIN", "SHOP"],
  "rails-station": ["RAILS", "STATION"],
  "policy-desk": ["POLICY", "DESK"],
  "agent-pay-arcade": ["AGENT PAY", "ARCADE"],
};

/** Studio banner headline (ALL CAPS, <=36 effective) per door. */
export const HEADLINES: Record<StorefrontDef["id"], string> = {
  "stablecoin-shop": "A PEG YOU KEEP, OR A DEPEG YOU FEEL",
  "rails-station": "ACH WAITS. CARDS TAX. USDC CLEARS",
  "policy-desk": "ONCHAIN HAS NO RECALL DESK",
  "agent-pay-arcade": "SETTLEMENT IS A CORRIDOR",
};

export const LESSONS: Record<StorefrontDef["id"], string> = {
  "stablecoin-shop":
    "A stablecoin is a dollar that trades 24/7. The peg holds only while reserves answer every redemption.",
  "rails-station":
    "Three rails, one Saturday: ACH lands Monday, cards clear now for 2.9%, USDC settles T+0 for pennies.",
  "policy-desk":
    "Banks recall. Chains do not. Simulate against chain state before the send, because after it there is no undo.",
  "agent-pay-arcade":
    "An agent paying an agent picks the rail that clears. Depeg and compliance holds are the traffic.",
};
