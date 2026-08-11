#!/usr/bin/env node
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, value) {
  fs.writeFileSync(path, value);
}

// ---------------------------------------------------------
// 1. Remove marketplace image bytes from Server Actions.
// ---------------------------------------------------------
{
  const path =
    "src/modules/marketplace-catalog/actions.ts";
  let source = read(path);

  source = source.replace(
    `import { deleteMarketplaceImage, MAX_OFFERING_IMAGES, uploadMarketplaceImage } from "@/modules/marketplace-catalog/media";`,
    `import { deleteMarketplaceImage } from "@/modules/marketplace-catalog/media";`,
  );

  const createImageStart =
    '  const images = data.getAll("images")';
  const auditStart =
    "  await prisma.auditEvent.create({";

  if (source.includes(createImageStart)) {
    const start = source.indexOf(createImageStart);
    const end = source.indexOf(auditStart, start);

    if (end === -1) {
      throw new Error(
        "Could not locate marketplace offering audit block.",
      );
    }

    source =
      source.slice(0, start) +
      source.slice(end);
  }

  const addStart =
    "export async function addMarketplaceOfferingImagesAction";
  const primaryStart =
    "export async function setMarketplaceOfferingPrimaryImageAction";

  if (source.includes(addStart)) {
    const start = source.indexOf(addStart);
    const end = source.indexOf(
      primaryStart,
      start,
    );

    if (end === -1) {
      throw new Error(
        "Could not locate primary image action.",
      );
    }

    source =
      source.slice(0, start) +
      source.slice(end);
  }

  write(path, source);
}

// ---------------------------------------------------------
// 2. Retire server-side Blob put() for marketplace images.
// ---------------------------------------------------------
{
  const path =
    "src/modules/marketplace-catalog/media.ts";
  let source = read(path);

  source = source.replace(
    'import { del, get, put } from "@vercel/blob";',
    'import { del, get } from "@vercel/blob";',
  );

  const uploadStart =
    "export async function uploadMarketplaceImage";
  const getStart =
    "export function getMarketplaceImage";

  if (source.includes(uploadStart)) {
    const start = source.indexOf(uploadStart);
    const end = source.indexOf(getStart, start);

    if (end === -1) {
      throw new Error(
        "Could not locate getMarketplaceImage.",
      );
    }

    source =
      source.slice(0, start) +
      source.slice(end);
  }

  write(path, source);
}

// ---------------------------------------------------------
// 3. Replace form-based image posting with direct uploader.
// ---------------------------------------------------------
{
  const path =
    "src/app/app/marketplace/catalog/page.tsx";
  let source = read(path);

  source = source.replace(
    `  addMarketplaceOfferingImagesAction,
`,
    "",
  );

  if (
    !source.includes(
      "@/components/marketplace/MarketplaceDirectImageUpload",
    )
  ) {
    source = source.replace(
      `import { MarketplaceComparisonResults } from "@/components/marketplace/MarketplaceComparisonResults";`,
      `import { MarketplaceComparisonResults } from "@/components/marketplace/MarketplaceComparisonResults";
import { MarketplaceDirectImageUpload } from "@/components/marketplace/MarketplaceDirectImageUpload";`,
    );
  }

  const initialImageBlock = `          <label className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2">
            <span className="block text-sm font-black text-slate-800">Product / service images</span>
            <span className="mt-1 block text-xs text-slate-500">Upload up to 8 JPG, PNG or WebP images. The first image becomes the primary marketplace image.</span>
            <input className="mt-3 block w-full text-sm" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple />
          </label>`;

  const initialReplacement = `          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700 md:col-span-2">
            <p className="font-black text-slate-900">Product gallery</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Publish the offering first, then upload up to 8 product images directly to Private Vercel Blob from the listing controls below.
            </p>
          </div>`;

  if (source.includes(initialImageBlock)) {
    source = source.replace(
      initialImageBlock,
      initialReplacement,
    );
  }

  const oldUploader = `                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3">
                  <input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="block w-full text-xs" />
                  <button formAction={addMarketplaceOfferingImagesAction} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white">Upload images</button>
                </div>`;

  const directUploader = `                <MarketplaceDirectImageUpload
                  offeringId={result.offering.id}
                  offeringName={result.offering.name}
                  existingCount={result.media.length}
                />`;

  if (source.includes(oldUploader)) {
    source = source.replace(
      oldUploader,
      directUploader,
    );
  }

  write(path, source);
}

console.log(
  "B13.10.4D direct marketplace media upload integration complete.",
);
console.log(
  "- Offering creation no longer submits image bytes through Server Actions.",
);
console.log(
  "- Marketplace gallery uploads now use authenticated direct Private Blob uploads.",
);
