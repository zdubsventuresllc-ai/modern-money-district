import type { StorefrontDef } from "./types";

/** Locked Stabledash Live tokens — cinematic editorial, not amber terminal. */
export const palette = {
  midnight: 0x11100e,
  midnightHex: "#11100e",
  charcoal: 0x1a1c17,
  charcoalHex: "#1a1c17",
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
  asphalt: 0x1a1c17,
  sidewalk: 0x2a2c26,
  slate: 0x2a2c26,
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
    subtitle: "ACH · cards · USDC",
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

export const LESSONS: Record<StorefrontDef["id"], string> = {
  "stablecoin-shop": "A stablecoin is a peg you keep — or a depeg you feel.",
  "rails-station": "ACH waits. Cards tax. USDC clears T+0.",
  "policy-desk": "On-chain has no recall desk. Simulate first.",
  "agent-pay-arcade": "Settlement is a corridor. Pick the rail that clears.",
};
