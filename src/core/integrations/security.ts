import { createHash, timingSafeEqual } from "node:crypto";

export function hashWebhookSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifyWebhookSecret(
  suppliedSecret: string | null,
  expectedHash: string | null,
) {
  if (!suppliedSecret || !expectedHash) return false;

  const suppliedHash = hashWebhookSecret(suppliedSecret);
  const supplied = Buffer.from(suppliedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function sanitizeHeaders(headers: Headers) {
  const allowed = [
    "content-type",
    "user-agent",
    "x-correlation-id",
    "x-event-id",
    "x-event-type",
  ];

  return Object.fromEntries(
    allowed
      .map((name) => [name, headers.get(name)])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}
