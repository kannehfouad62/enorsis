"use client";

import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { useMemo, useState } from "react";

type MarketplaceMedia = {
  id: string;
  altText: string | null;
  isPrimary: boolean;
  position: number;
};

export function MarketplaceProductGallery({
  media,
  offeringName,
}: {
  media: MarketplaceMedia[];
  offeringName: string;
}) {
  const ordered = useMemo(
    () =>
      [...media].sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }
        return left.position - right.position;
      }),
    [media],
  );

  const [index, setIndex] = useState(0);
  const active = ordered[index];

  function previous() {
    if (ordered.length <= 1) return;
    setIndex((current) =>
      current === 0 ? ordered.length - 1 : current - 1,
    );
  }

  function next() {
    if (ordered.length <= 1) return;
    setIndex((current) =>
      current === ordered.length - 1 ? 0 : current + 1,
    );
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
        {active ? (
          <img
            src={`/api/marketplace/catalog/media/${active.id}`}
            alt={active.altText ?? offeringName}
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <PackageSearch className="h-14 w-14" />
          </div>
        )}

        {ordered.length > 1 ? (
          <>
            <button
              type="button"
              onClick={previous}
              aria-label="Previous product image"
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-slate-800 shadow ring-1 ring-slate-200 hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next product image"
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-slate-800 shadow ring-1 ring-slate-200 hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-black text-white">
              {index + 1} / {ordered.length}
            </span>
          </>
        ) : null}
      </div>

      {ordered.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {ordered.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              aria-label={`View product image ${itemIndex + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white ${
                itemIndex === index
                  ? "border-blue-600 ring-2 ring-blue-100"
                  : "border-slate-200"
              }`}
            >
              <img
                src={`/api/marketplace/catalog/media/${item.id}`}
                alt={item.altText ?? offeringName}
                className="h-full w-full object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
