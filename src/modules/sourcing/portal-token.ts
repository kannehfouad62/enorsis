import { createHash, randomBytes } from "node:crypto";

export function createSupplierPortalToken() {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashSupplierPortalToken(token),
  };
}

export function hashSupplierPortalToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
