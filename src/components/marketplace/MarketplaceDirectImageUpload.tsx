"use client";

import { upload } from "@vercel/blob/client";
import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_IMAGES = 8;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function MarketplaceDirectImageUpload({
  offeringId,
  offeringName,
  existingCount,
}: {
  offeringId: string;
  offeringName: string;
  existingCount: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const remaining = Math.max(0, MAX_IMAGES - existingCount);

  async function uploadImages() {
    const files = Array.from(inputRef.current?.files ?? []);

    if (!files.length) {
      setMessage("Select at least one product image.");
      return;
    }

    if (files.length > remaining) {
      setMessage(
        `You can upload ${remaining} more image${remaining === 1 ? "" : "s"} for this offering.`,
      );
      return;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        setMessage("Only JPG, PNG and WebP images are supported.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setMessage(`${file.name} exceeds the 8 MB image limit.`);
        return;
      }
    }

    setUploading(true);
    setMessage(null);

    try {
      for (const file of files) {
        const safeName = file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "-",
        );

        const blob = await upload(
          `marketplace/${offeringId}/${crypto.randomUUID()}-${safeName}`,
          file,
          {
            access: "private",
            handleUploadUrl:
              "/api/marketplace/catalog/media/upload",
            clientPayload: JSON.stringify({
              offeringId,
            }),
            multipart: true,
          },
        );

        const response = await fetch(
          "/api/marketplace/catalog/media/register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              offeringId,
              pathname: blob.pathname,
              altText: offeringName,
            }),
          },
        );

        const payload = (await response.json()) as {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.error ??
              "The uploaded image could not be registered.",
          );
        }
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setMessage(
        `${files.length} image${files.length === 1 ? "" : "s"} uploaded successfully.`,
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Marketplace image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
          <ImagePlus className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-black text-slate-800">
            Product gallery
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            {remaining > 0
              ? `${remaining} image slot${remaining === 1 ? "" : "s"} remaining. JPG, PNG or WebP · up to 8 MB each.`
              : "This offering already contains the maximum of 8 images."}
          </p>
        </div>
      </div>

      {remaining > 0 ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            className="mt-3 block w-full text-xs"
          />

          <button
            type="button"
            onClick={uploadImages}
            disabled={uploading}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading
              ? "Uploading directly..."
              : "Upload images"}
          </button>
        </>
      ) : null}

      {message ? (
        <p
          className="mt-2 text-xs font-semibold text-slate-600"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
