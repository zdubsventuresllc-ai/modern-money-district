export type StorefrontId =
  | "stablecoin-shop"
  | "rails-station"
  | "policy-desk"
  | "agent-pay-arcade";

export interface Claim {
  storefrontId: StorefrontId;
  guestName: string;
  claim: string;
  episodeTitle: string;
  episodeUrl: string;
  clipUrl?: string;
}

export interface ClaimsFile {
  notice: string;
  claims: Claim[];
}

export interface StorefrontDef {
  id: StorefrontId;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  facing: 1 | -1;
}

export type GameMode = "splash" | "street" | "claim" | "arcade" | "arcade-result";
