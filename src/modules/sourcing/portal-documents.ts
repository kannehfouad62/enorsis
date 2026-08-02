import { get, put } from "@vercel/blob";

const allowedTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export function validateSourcingAttachment(file: File) {
  if (!file.name || file.size === 0) {
    throw new Error("Select a file to upload.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Sourcing attachments must be 4 MB or smaller.");
  }

  if (!allowedTypes.has(file.type)) {
    throw new Error("Only PDF, PNG, JPEG, DOCX and XLSX files are supported.");
  }
}

export async function uploadPrivateSourcingAttachment(
  tenantId: string,
  eventId: string,
  file: File,
) {
  validateSourcingAttachment(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const pathname =
    `tenants/${tenantId}/sourcing/${eventId}/` +
    `${crypto.randomUUID()}-${safeName}`;

  return put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });
}

export function getPrivateSourcingAttachment(pathname: string) {
  return get(pathname, { access: "private" });
}
