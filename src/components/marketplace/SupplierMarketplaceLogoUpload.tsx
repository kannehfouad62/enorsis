"use client";

import { upload } from "@vercel/blob/client";
import { Building2, ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function SupplierMarketplaceLogoUpload({
  supplierId,
  supplierName,
  hasLogo,
}: {
  supplierId: string;
  supplierName: string;
  hasLogo: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadLogo() {
    const file = inputRef.current?.files?.[0];

    if (!file) {
      setMessage("Select a business logo.");
      return;
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      setMessage("Only JPG, PNG and WebP logos are supported.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage("Business logos must be 4 MB or smaller.");
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "-",
      );

      const blob = await upload(
        `marketplace/suppliers/${supplierId}/logo-${crypto.randomUUID()}-${safeName}`,
        file,
        {
          access: "private",
          handleUploadUrl:
            "/api/marketplace/supplier-logo/upload",
          clientPayload: JSON.stringify({
            supplierId,
          }),
          multipart: false,
        },
      );

      const response = await fetch(
        "/api/marketplace/supplier-logo/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplierId,
            pathname: blob.pathname,
            contentType: file.type,
          }),
        },
      );

      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "The business logo could not be registered.",
        );
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setMessage(
        hasLogo
          ? "Business logo replaced successfully."
          : "Business logo uploaded successfully.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Business logo upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {hasLogo ? (
            <img
              src={`/api/marketplace/supplier-logo/${supplierId}`}
              alt={`${supplierName} business logo`}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <Building2 className="h-9 w-9 text-slate-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Marketplace seller profile
          </p>
          <h2 className="mt-1 text-lg font-black">
            Business logo
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Upload your company logo once. Buyers will see it on your marketplace
            vendor profile. JPG, PNG or WebP · maximum 4 MB.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            className="mt-3 block w-full text-xs"
          />

          <button
            type="button"
            onClick={uploadLogo}
            disabled={uploading}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploading
              ? "Uploading..."
              : hasLogo
                ? "Replace business logo"
                : "Upload business logo"}
          </button>

          {message ? (
            <p className="mt-2 text-xs font-semibold text-slate-600" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
