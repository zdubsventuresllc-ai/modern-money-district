import type {
  Claim,
  ClaimStorefront,
  ClaimsFile,
  ClaimsMeta,
  StorefrontId,
} from "./types";

export const STOREFRONT_KEYS: Record<StorefrontId, ClaimStorefront> = {
  "stablecoin-shop": "stablecoin",
  "rails-station": "rails",
  "policy-desk": "policy",
  "agent-pay-arcade": "arcade",
};

const EP56 = "https://www.youtube.com/watch?v=YHFAFX757a0";

type Raw = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function canonStorefront(raw: string): ClaimStorefront | null {
  const key = raw.trim().toLowerCase();
  if (key === "stablecoin" || key === "stablecoin-shop") return "stablecoin";
  if (key === "rails" || key === "rails-station") return "rails";
  if (key === "policy" || key === "policy-desk") return "policy";
  if (key === "arcade" || key === "agent-pay-arcade") return "arcade";
  return null;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const next = text(value);
    if (next) return next;
  }
  return "";
}

function normalizeClaim(raw: Raw, index: number): Claim | null {
  const storefront = canonStorefront(
    firstText(raw.storefront, raw.storefrontId),
  );
  if (!storefront) return null;
  const quote = firstText(raw.quote, raw.claim);
  if (!quote) return null;
  const video = firstText(raw.videoUrl, raw.episodeUrl);
  return {
    id: firstText(raw.id) || `claim-${index}`,
    storefront,
    guest: firstText(raw.guest, raw.guestName),
    company: text(raw.company),
    role: text(raw.role),
    quote,
    episode: firstText(raw.episode, raw.episodeTitle),
    date: text(raw.date),
    videoUrl: video || null,
    verified: raw.verified === true,
    note: text(raw.note) || undefined,
    clipNote: text(raw.clipNote) || undefined,
  };
}

export function normalizeClaimsFile(data: unknown): ClaimsFile {
  const raw = (data ?? {}) as Raw;
  const metaRaw = (raw.meta ?? {}) as Raw;
  const meta: ClaimsMeta = {
    title: firstText(metaRaw.title, "Modern Money District"),
    subtitle: firstText(metaRaw.subtitle, "a Stabledash experiment"),
    sourceNote: text(metaRaw.sourceNote) || text(raw.notice),
    episodeYoutube: firstText(metaRaw.episodeYoutube, EP56),
  };
  const list = Array.isArray(raw.claims) ? raw.claims : [];
  const claims = list
    .map((item, i) =>
      item && typeof item === "object"
        ? normalizeClaim(item as Raw, i)
        : null,
    )
    .filter((item): item is Claim => item !== null);
  return { meta, claims };
}

export async function loadClaims(): Promise<ClaimsFile> {
  const url = `${import.meta.env.BASE_URL}claims.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`claims.json failed (${res.status})`);
  }
  return normalizeClaimsFile(await res.json());
}

export function claimsFor(file: ClaimsFile, id: StorefrontId): Claim[] {
  const key = STOREFRONT_KEYS[id];
  return file.claims
    .filter((c) => c.storefront === key)
    .sort((a, b) => Number(b.verified) - Number(a.verified));
}

export function tapeClaims(file: ClaimsFile, id: StorefrontId): Claim[] {
  return claimsFor(file, id).filter((c) => c.verified);
}

export function primaryClaim(
  file: ClaimsFile,
  id: StorefrontId,
): Claim | undefined {
  return tapeClaims(file, id)[0];
}
