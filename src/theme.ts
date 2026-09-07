import type { StorefrontDef } from "./types";

/** Stabledash brand lock — midnight / charcoal / ivory / lime. */
export const palette = {
  ink: 0x11100e,
  inkHex: "#11100e",
  charcoal: 0x1a1c17,
  charcoalHex: "#1a1c17",
  ivory: 0xf5f5f7,
  ivoryHex: "#f5f5f7",
  secondary: 0xa7a5a0,
  secondaryHex: "#a7a5a0",
  smoke: 0x8b8b9e,
  smokeHex: "#8b8b9e",
  lime: 0xd0ea66,
  limeHex: "#d0ea66",
  /** @deprecated use lime — kept so any stray refs compile during re-skin */
  amber: 0xd0ea66,
  amberHex: "#d0ea66",
  cream: 0xf5f5f7,
  creamHex: "#f5f5f7",
  navy: 0x1a1c17,
  navyHex: "#1a1c17",
  slate: 0x22241f,
  asphalt: 0x141310,
  sidewalk: 0x2a2c27,
  dim: 0x8b8b9e,
  danger: 0xc44b2b,
  ok: 0xd0ea66,
} as const;

export const STOREFRONTS: StorefrontDef[] = [
  {
    id: "stablecoin",
    name: "STABLECOIN SHOP",
    subtitle: "24/7 DOLLAR RAILS",
    x: -6.2,
    z: -8.4,
    facing: 1,
  },
  {
    id: "rails",
    name: "RAILS STATION",
    subtitle: "CARDS · ACH · ON-CHAIN",
    x: 6.2,
    z: -8.4,
    facing: 1,
  },
  {
    id: "policy",
    name: "POLICY DESK",
    subtitle: "SIM · UNDO · FAIL",
    x: -6.2,
    z: 8.4,
    facing: -1,
  },
  {
    id: "arcade",
    name: "AGENT PAY ARCADE",
    subtitle: "SETTLEMENT RUN",
    x: 6.2,
    z: 8.4,
    facing: -1,
  },
];

/** Live Stabledash sponsors — skip TEST. Logos via public CDN URLs. */
export const SPONSORS: ReadonlyArray<{ name: string; logoUrl: string }> = [
  {
    name: "Dfns",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/dfns-1780415403983.png",
  },
  {
    name: "Dakota",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/dakota-1779983351596.webp",
  },
  {
    name: "Breeze",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/breeze-1779457546281.svg",
  },
  {
    name: "HopNow",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/hopnow-logo-white-text-1781185794638.svg",
  },
  {
    name: "Agora",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/agora-1779983169132.png",
  },
  {
    name: "Altitude",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/altitude-1779983194741.png",
  },
  {
    name: "Artemis",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/artemis-1779983258861.png",
  },
  {
    name: "Kast",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/kast-1779983374014.png",
  },
  {
    name: "Coast",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/coast-1779983750857.png",
  },
  {
    name: "Movement",
    logoUrl:
      "https://app.stabledash.com/storage/v1/object/public/takeone/media/images/Logo_Movement_Full_White-1784593034063.png",
  },
];
