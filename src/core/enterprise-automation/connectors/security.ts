import { isIP } from "node:net";

const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
];

function isUnsafeHost(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "::1"
  ) {
    return true;
  }

  if (isIP(normalized) === 4) {
    return PRIVATE_IPV4.some((pattern) =>
      pattern.test(normalized),
    );
  }

  if (isIP(normalized) === 6) {
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return false;
}

export function validateAutomationConnectorUrl(input: {
  url: string;
  allowedHosts: string[];
}) {
  const parsed = new URL(input.url);

  if (parsed.protocol !== "https:") {
    throw new Error(
      "Automation HTTP connectors require HTTPS.",
    );
  }

  if (isUnsafeHost(parsed.hostname)) {
    throw new Error(
      "Automation connector target is not permitted.",
    );
  }

  const allowed = input.allowedHosts.map((host) =>
    host.trim().toLowerCase(),
  );

  if (
    allowed.length > 0 &&
    !allowed.includes(parsed.hostname.toLowerCase())
  ) {
    throw new Error(
      `Connector host ${parsed.hostname} is not allowlisted.`,
    );
  }

  return parsed;
}

export function resolveConnectorSecret(
  secretEnvKey: string | null | undefined,
) {
  if (!secretEnvKey) return null;

  if (!/^[A-Z0-9_]+$/.test(secretEnvKey)) {
    throw new Error(
      "Connector secretEnvKey must be an environment variable name.",
    );
  }

  const value = process.env[secretEnvKey];

  if (!value) {
    throw new Error(
      `Connector secret environment variable ${secretEnvKey} is not configured.`,
    );
  }

  return value;
}
