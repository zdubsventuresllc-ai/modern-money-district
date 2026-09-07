import type { Claim, ClaimsFile, StorefrontId } from "./types";

export const STOREFRONT_KEYS: Record<
  StorefrontId,
  Claim["storefront"]
> = {
  "stablecoin-shop": "stablecoin",
  "rails-station": "rails",
  "policy-desk": "policy",
  "agent-pay-arcade": "arcade",
};

export async function loadClaims(): Promise<ClaimsFile> {
  const url = `${import.meta.env.BASE_URL}claims.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`claims.json failed (${res.status})`);
  }
  const data = (await res.json()) as ClaimsFile;
  if (!data.claims || !Array.isArray(data.claims)) {
    throw new Error("claims.json missing claims[]");
  }
  return data;
}

export function claimsFor(
  file: ClaimsFile,
  id: StorefrontId,
): Claim[] {
  const key = STOREFRONT_KEYS[id];
  return file.claims
    .filter((c) => c.storefront === key)
    .sort((a, b) => Number(b.verified) - Number(a.verified));
}

export function primaryClaim(
  file: ClaimsFile,
  id: StorefrontId,
): Claim | undefined {
  const list = claimsFor(file, id);
  return list.find((c) => c.verified) ?? list[0];
}
