import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = "v1";

function masterKey() {
  const encoded = process.env.ENORSIS_VAULT_MASTER_KEY;

  if (!encoded) {
    throw new Error("ENORSIS_VAULT_MASTER_KEY is not configured.");
  }

  const key = Buffer.from(encoded, "base64");

  if (key.length != 32) {
    throw new Error(
      "ENORSIS_VAULT_MASTER_KEY must be a base64-encoded 32-byte key.",
    );
  }

  return key;
}

export function encryptVaultValue(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authenticationTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    initializationVector: iv.toString("base64"),
    authenticationTag: authenticationTag.toString("base64"),
    keyVersion: KEY_VERSION,
    checksum: createHash("sha256").update(plaintext).digest("hex"),
  };
}

export function decryptVaultValue({
  ciphertext,
  initializationVector,
  authenticationTag,
}: {
  ciphertext: string;
  initializationVector: string;
  authenticationTag: string;
}) {
  const decipher = createDecipheriv(
    ALGORITHM,
    masterKey(),
    Buffer.from(initializationVector, "base64"),
  );

  decipher.setAuthTag(Buffer.from(authenticationTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
