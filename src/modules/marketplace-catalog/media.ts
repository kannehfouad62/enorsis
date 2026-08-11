import { del, get } from "@vercel/blob";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 8 * 1024 * 1024;
export const MAX_OFFERING_IMAGES = 8;

export function validateMarketplaceImage(file: File) {
  if (!file.name || file.size === 0) throw new Error("Select a product image to upload.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Marketplace images must be 8 MB or smaller.");
  if (!allowedTypes.has(file.type)) throw new Error("Only JPG, PNG and WebP marketplace images are supported.");
}

export function getMarketplaceImage(pathname: string) {
  return get(pathname, { access: "private" });
}

export async function deleteMarketplaceImage(pathname: string) {
  await del(pathname);
}
