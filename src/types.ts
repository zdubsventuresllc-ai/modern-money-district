export type StorefrontId =
  | "stablecoin"
  | "rails"
  | "policy"
  | "arcade";

export interface Claim {
  id: string;
  storefront: StorefrontId;
  guest: string;
  company: string;
  role?: string;
  quote: string;
  episode: string;
  date: string;
  videoUrl?: string | null;
  clipNote?: string;
  verified: boolean;
  note?: string;
}

export interface ClaimsFile {
  meta: {
    title: string;
    subtitle: string;
    sourceNote: string;
    episodeYoutube?: string;
  };
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
