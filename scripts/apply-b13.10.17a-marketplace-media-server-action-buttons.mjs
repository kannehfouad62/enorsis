#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);

  if (after === before) {
    console.log(`No change required: ${path}`);
    return;
  }

  fs.writeFileSync(path, after);
  console.log(`Updated: ${path}`);
}

patch("src/modules/marketplace-catalog/actions.ts", (source) => {
  source = source.replace(
    `export async function setMarketplaceOfferingPrimaryImageAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const mediaId = field(data, "mediaId");`,
    `export async function setMarketplaceOfferingPrimaryImageAction(
  mediaId: string,
  _data: FormData,
) {
  const user = await requireAnyRole([...roles]);`,
  );

  source = source.replace(
    `export async function deleteMarketplaceOfferingImageAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const mediaId = field(data, "mediaId");`,
    `export async function deleteMarketplaceOfferingImageAction(
  mediaId: string,
  _data: FormData,
) {
  const user = await requireAnyRole([...roles]);`,
  );

  return source;
});

patch("src/app/app/marketplace/catalog/page.tsx", (source) => {
  source = source.replace(
    `                          {!item.isPrimary ? <button formAction={setMarketplaceOfferingPrimaryImageAction} name="mediaId" value={item.id} className="text-[10px] font-black text-blue-700">Make primary</button> : <span className="text-[10px] font-black text-emerald-700">Primary</span>}
                          <button formAction={deleteMarketplaceOfferingImageAction} name="mediaId" value={item.id} className="text-[10px] font-black text-rose-700">Remove</button>`,
    `                          {!item.isPrimary ? (
                            <button
                              formAction={setMarketplaceOfferingPrimaryImageAction.bind(
                                null,
                                item.id,
                              )}
                              className="text-[10px] font-black text-blue-700"
                            >
                              Make primary
                            </button>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-700">
                              Primary
                            </span>
                          )}
                          <button
                            formAction={deleteMarketplaceOfferingImageAction.bind(
                              null,
                              item.id,
                            )}
                            className="text-[10px] font-black text-rose-700"
                          >
                            Remove
                          </button>`,
  );

  return source;
});

console.log(
  "B13.10.17a marketplace media Server Action button fix complete.",
);
