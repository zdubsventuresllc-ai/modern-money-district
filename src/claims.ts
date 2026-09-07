import type { Claim, ClaimsFile, StorefrontId } from "./types";

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

/** Prefer verified claims first; keep original order within tiers. */
export function claimsFor(
  file: ClaimsFile,
  id: StorefrontId,
): Claim[] {
  const list = file.claims.filter((c) => c.storefront === id);
  return [
    ...list.filter((c) => c.verified),
    ...list.filter((c) => !c.verified),
  ];
}

export function primaryClaim(
  file: ClaimsFile,
  id: StorefrontId,
): Claim | undefined {
  return claimsFor(file, id)[0];
}
