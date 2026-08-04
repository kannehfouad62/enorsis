import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function issueApiKey() {
  const secret = randomBytes(32).toString("base64url");
  const prefix = secret.slice(0, 10);

  return {
    plaintext: `enorsis_${secret}`,
    prefix: `enorsis_${prefix}`,
    hash: hashApiKey(`enorsis_${secret}`),
  };
}

export function hashApiKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeHashEquals(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");

  return a.length === b.length && timingSafeEqual(a, b);
}
