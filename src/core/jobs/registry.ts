import type { PlatformJobHandler } from "./types";

const handlers = new Map<string, PlatformJobHandler>();

export function registerPlatformJobHandler(
  key: string,
  handler: PlatformJobHandler,
) {
  if (handlers.has(key)) {
    throw new Error(`Platform job handler ${key} is already registered.`);
  }

  handlers.set(key, handler);
}

export function getPlatformJobHandler(key: string) {
  return handlers.get(key) ?? null;
}

export function listPlatformJobHandlers() {
  return [...handlers.keys()].sort();
}
