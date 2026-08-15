import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env.ENORSIS_BANKING_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("ENORSIS_BANKING_ENCRYPTION_KEY must be configured with at least 32 characters.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptBankingPayload(payload: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(payload), "utf8")), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptBankingPayload(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) throw new Error("Unsupported encrypted banking payload.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as Record<string, string>;
}

export function bankingFingerprint(input: { sellerTenantId: string; bankName: string; accountNumber: string; routingNumber?: string; iban?: string; swiftBic?: string; }) {
  return createHash("sha256").update([
    input.sellerTenantId,
    input.bankName.trim().toUpperCase(),
    input.accountNumber.replace(/\\s+/g, ""),
    input.routingNumber?.replace(/\\s+/g, "") ?? "",
    input.iban?.replace(/\\s+/g, "").toUpperCase() ?? "",
    input.swiftBic?.replace(/\\s+/g, "").toUpperCase() ?? "",
  ].join("|")).digest("hex");
}
