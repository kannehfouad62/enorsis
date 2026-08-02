import { get, put } from "@vercel/blob";

const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export function validateContractDocument(file: File) {
  if (!file.name || file.size === 0) {
    throw new Error("Select a contract document.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Contract documents must be 4 MB or smaller.");
  }

  if (!allowedTypes.has(file.type)) {
    throw new Error("Only PDF and DOCX contract documents are supported.");
  }
}

export async function uploadPrivateContractDocument(
  tenantId: string,
  contractId: string,
  file: File,
) {
  validateContractDocument(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const pathname =
    `tenants/${tenantId}/contracts/${contractId}/` +
    `${crypto.randomUUID()}-${safeName}`;

  return put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });
}

export function getPrivateContractDocument(pathname: string) {
  return get(pathname, { access: "private" });
}
