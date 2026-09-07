import type { StorefrontDef } from "./types";

export const palette = {
  ink: 0x0b0b09,
  inkHex: "#0b0b09",
  amber: 0xe8a317,
  amberHex: "#e8a317",
  cream: 0xe8e0d0,
  creamHex: "#e8e0d0",
  navy: 0x101820,
  navyHex: "#101820",
  slate: 0x1a222c,
  asphalt: 0x161614,
  sidewalk: 0xc9c0ad,
  dim: 0x6b6456,
  danger: 0xc44b2b,
  ok: 0x7cb07c,
} as const;

export const STOREFRONTS: StorefrontDef[] = [
  {
    id: "stablecoin-shop",
    name: "STABLECOIN SHOP",
    subtitle: "PEG / RESERVES",
    x: -6.2,
    z: -8.4,
    facing: 1,
  },
  {
    id: "rails-station",
    name: "RAILS STATION",
    subtitle: "ACH / CARDS / USDC",
    x: 6.2,
    z: -8.4,
    facing: 1,
  },
  {
    id: "policy-desk",
    name: "POLICY DESK",
    subtitle: "RULEBOOK / DESK HOURS",
    x: -6.2,
    z: 8.4,
    facing: -1,
  },
  {
    id: "agent-pay-arcade",
    name: "AGENT PAY ARCADE",
    subtitle: "SETTLEMENT RUN",
    x: 6.2,
    z: 8.4,
    facing: -1,
  },
];
