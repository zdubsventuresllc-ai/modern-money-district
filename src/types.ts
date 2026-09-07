export type StorefrontId =
  | "stablecoin-shop"
  | "rails-station"
  | "policy-desk"
  | "agent-pay-arcade";

export type ClaimStorefront = "stablecoin" | "rails" | "policy" | "arcade";

export interface Claim {
  id: string;
  storefront: ClaimStorefront;
  guest: string;
  company: string;
  role: string;
  quote: string;
  episode: string;
  date: string;
  videoUrl: string | null;
  verified: boolean;
  note?: string;
  clipNote?: string;
}

export interface ClaimsMeta {
  title: string;
  subtitle: string;
  sourceNote: string;
  episodeYoutube: string;
}

export interface ClaimsFile {
  meta: ClaimsMeta;
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
