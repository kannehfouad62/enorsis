import { get, put } from "@vercel/blob";

const allowedTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export function validateSupplierDocument(file: File) {
  if (!file.name || file.size === 0) {
    throw new Error("Select a supplier document to upload.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Supplier documents must be 4 MB or smaller.");
  }

  if (!allowedTypes.has(file.type)) {
    throw new Error("Only PDF, PNG, JPEG and DOCX documents are supported.");
  }
}

export async function uploadPrivateSupplierDocument(
  tenantId: string,
  supplierId: string,
  file: File,
) {
  validateSupplierDocument(file);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const pathname = `tenants/${tenantId}/suppliers/${supplierId}/${crypto.randomUUID()}-${safeName}`;

  return put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });
}

export async function getPrivateSupplierDocument(pathname: string) {
  return get(pathname, { access: "private" });
}
