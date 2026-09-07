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

export function claimFor(
  file: ClaimsFile,
  id: StorefrontId,
): Claim | undefined {
  return file.claims.find((c) => c.storefrontId === id);
}
