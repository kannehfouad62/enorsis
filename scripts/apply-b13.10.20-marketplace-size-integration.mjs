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

// ---------------------------------------------------------
// 1. Marketplace cart type
// ---------------------------------------------------------
patch("src/core/marketplace-commerce/types.ts", (source) => {
  if (!source.includes("availableSizes: string[];")) {
    source = source.replace(
      `  minimumOrderQty: number | null;
  leadTimeDays: number | null;`,
      `  minimumOrderQty: number | null;
  leadTimeDays: number | null;
  availableSizes: string[];
  selectedSize: string | null;`,
    );
  }

  return source;
});

// ---------------------------------------------------------
// 2. Supplier create/update offering actions
// ---------------------------------------------------------
patch("src/modules/marketplace-catalog/actions.ts", (source) => {
  if (!source.includes('field(data, "availableSizes")')) {
    source = source.replace(
      `        availabilityStatus:
          field(data, "availabilityStatus") ||
          "AVAILABLE",
        countriesAvailable: list(`,
      `        availabilityStatus:
          field(data, "availabilityStatus") ||
          "AVAILABLE",
        availableSizes: list(
          field(data, "availableSizes"),
        ),
        countriesAvailable: list(`,
    );

    source = source.replace(
      `        availabilityStatus:
          field(data, "availabilityStatus") ||
          current.availabilityStatus,
        countriesAvailable: list(`,
      `        availabilityStatus:
          field(data, "availabilityStatus") ||
          current.availabilityStatus,
        availableSizes: list(
          field(data, "availableSizes"),
        ),
        countriesAvailable: list(`,
    );

    source = source.replace(
      `        marketplaceVisible,
      },`,
      `        marketplaceVisible,
        availableSizes: offering.availableSizes,
      },`,
    );

    source = source.replace(
      `        countriesAvailable:
          current.countriesAvailable,
      },`,
      `        countriesAvailable:
          current.countriesAvailable,
        availableSizes:
          current.availableSizes,
      },`,
    );

    source = source.replace(
      `        countriesAvailable:
          updated.countriesAvailable,
      },`,
      `        countriesAvailable:
          updated.countriesAvailable,
        availableSizes:
          updated.availableSizes,
      },`,
    );
  }

  return source;
});

// ---------------------------------------------------------
// 3. Publish offering form
// ---------------------------------------------------------
patch(
  "src/app/app/marketplace/catalog/new/page.tsx",
  (source) => {
    if (!source.includes('name="availableSizes"')) {
      const anchor = `          <select
            className={input}
            name="availabilityStatus"
            defaultValue="AVAILABLE"
          >
            <option value="AVAILABLE">Available</option>
            <option value="LIMITED">Limited</option>
            <option value="BACKORDER">Backorder</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>`;

      const replacement = `${anchor}

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
              Available sizes
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-slate-500">
              Optional. For wearable products such as safety vests, gloves,
              footwear or uniforms, enter every size currently available.
              Separate sizes with commas.
            </span>
            <input
              className="mt-2 w-full border-0 p-0 text-sm text-slate-950 outline-none"
              name="availableSizes"
              placeholder="XS, S, M, L, XL, 2XL"
            />
          </label>`;

      if (!source.includes(anchor)) {
        throw new Error(
          "Publish Offering availability control anchor was not found.",
        );
      }

      source = source.replace(anchor, replacement);
    }

    return source;
  },
);

// ---------------------------------------------------------
// 4. Edit offering form
// ---------------------------------------------------------
patch(
  "src/app/app/marketplace/catalog/[id]/edit/page.tsx",
  (source) => {
    if (!source.includes('name="availableSizes"')) {
      const anchor = `          <select
            className={input}
            name="availabilityStatus"
            defaultValue={offering.availabilityStatus}
          >
            <option value="AVAILABLE">Available</option>
            <option value="LIMITED">Limited</option>
            <option value="BACKORDER">Backorder</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>`;

      const replacement = `${anchor}

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
              Available sizes
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-slate-500">
              Optional. Separate available wearable sizes with commas.
            </span>
            <input
              className="mt-2 w-full border-0 p-0 text-sm text-slate-950 outline-none"
              name="availableSizes"
              defaultValue={offering.availableSizes.join(", ")}
              placeholder="XS, S, M, L, XL, 2XL"
            />
          </label>`;

      if (!source.includes(anchor)) {
        throw new Error(
          "Edit Offering availability control anchor was not found.",
        );
      }

      source = source.replace(anchor, replacement);
    }

    return source;
  },
);

// ---------------------------------------------------------
// 5. Catalog presentation passes sizes to cart
// ---------------------------------------------------------
patch(
  "src/components/marketplace/MarketplaceComparisonResults.tsx",
  (source) => {
    if (!source.includes("availableSizes: offer.offering.availableSizes")) {
      source = source.replace(
        `                                      leadTimeDays: offer.offering.leadTimeDays,
                                      imageRef: offer.offering.imageRef,`,
        `                                      leadTimeDays: offer.offering.leadTimeDays,
                                      availableSizes:
                                        offer.offering.availableSizes,
                                      selectedSize: null,
                                      imageRef: offer.offering.imageRef,`,
      );
    }

    if (
      !source.includes(
        "offer.offering.availableSizes.length > 0",
      )
    ) {
      source = source.replace(
        `                              <td className="px-4 py-4">
                                {
                                  offer.offering
                                    .availabilityStatus
                                }
                              </td>`,
        `                              <td className="px-4 py-4">
                                <p>
                                  {
                                    offer.offering
                                      .availabilityStatus
                                  }
                                </p>
                                {offer.offering.availableSizes.length > 0 ? (
                                  <p className="mt-1 max-w-56 text-xs text-slate-500">
                                    Sizes: {offer.offering.availableSizes.join(", ")}
                                  </p>
                                ) : null}
                              </td>`,
      );
    }

    return source;
  },
);

// ---------------------------------------------------------
// 6. Add-to-cart requires size when offering has sizes.
//    Cart key becomes offering + selected size.
// ---------------------------------------------------------
patch(
  "src/components/marketplace/MarketplaceAddToCartButton.tsx",
  (source) => {
    source = source.replace(
      `  const [quantity, setQuantity] = useState(minimum);
  const [message, setMessage] = useState<string | null>(null);`,
      `  const [quantity, setQuantity] = useState(minimum);
  const [selectedSize, setSelectedSize] = useState(
    item.availableSizes.length === 1
      ? item.availableSizes[0]
      : "",
  );
  const [message, setMessage] = useState<string | null>(null);`,
    );

    source = source.replace(
      `  function addToCart() {
    const cart = readCart();
    const index = cart.findIndex((entry) => entry.offeringId === item.offeringId);
    const next = { ...item, quantity };`,
      `  function addToCart() {
    if (
      item.availableSizes.length > 0 &&
      !selectedSize
    ) {
      setMessage("Select a size before adding this item.");
      return;
    }

    const cart = readCart();
    const normalizedSize =
      selectedSize || null;
    const index = cart.findIndex(
      (entry) =>
        entry.offeringId === item.offeringId &&
        entry.selectedSize === normalizedSize,
    );
    const next = {
      ...item,
      quantity,
      selectedSize: normalizedSize,
    };`,
    );

    source = source.replace(
      `  return (
    <div className="flex flex-wrap items-center gap-2">
      <input`,
      `  return (
    <div className="flex flex-wrap items-center gap-2">
      {item.availableSizes.length > 0 ? (
        <select
          aria-label={\`Size for \${item.offeringName}\`}
          value={selectedSize}
          onChange={(event) => {
            setSelectedSize(event.target.value);
            setMessage(null);
          }}
          className="min-w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {item.availableSizes.length > 1 ? (
            <option value="">Select size</option>
          ) : null}
          {item.availableSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      ) : null}

      <input`,
    );

    return source;
  },
);

// ---------------------------------------------------------
// 7. Checkout treats size variants as unique lines.
// ---------------------------------------------------------
patch(
  "src/components/marketplace/MarketplaceCheckout.tsx",
  (source) => {
    if (!source.includes("function cartLineKey")) {
      source = source.replace(
        `type ApproverOption = {
  userId: string;`,
        `function cartLineKey(item: MarketplaceCartItem) {
  return \`\${item.offeringId}::\${item.selectedSize ?? ""}\`;
}

type ApproverOption = {
  userId: string;`,
      );
    }

    source = source.replace(
      `  function updateQuantity(offeringId: string, quantity: number) {
    const next = items.map((item) =>
      item.offeringId === offeringId
        ? { ...item, quantity: Math.max(item.minimumOrderQty ?? 1, quantity || 1) }
        : item,
    );`,
      `  function updateQuantity(
    lineKey: string,
    quantity: number,
  ) {
    const next = items.map((item) =>
      cartLineKey(item) === lineKey
        ? {
            ...item,
            quantity: Math.max(
              item.minimumOrderQty ?? 1,
              quantity || 1,
            ),
          }
        : item,
    );`,
    );

    source = source.replace(
      `  function remove(offeringId: string) {
    const next = items.filter((item) => item.offeringId !== offeringId);`,
      `  function remove(lineKey: string) {
    const next = items.filter(
      (item) => cartLineKey(item) !== lineKey,
    );`,
    );

    source = source.replace(
      `<div key={item.offeringId} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_120px_150px_auto]">`,
      `<div key={cartLineKey(item)} className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_120px_150px_auto]">`,
    );

    source = source.replace(
      `<p className="mt-1 text-xs text-slate-500">{item.supplierName}{item.sku ? \` · \${item.sku}\` : ""}</p>`,
      `<p className="mt-1 text-xs text-slate-500">
                  {item.supplierName}
                  {item.sku ? \` · \${item.sku}\` : ""}
                  {item.selectedSize
                    ? \` · Size \${item.selectedSize}\`
                    : ""}
                </p>`,
    );

    source = source.replace(
      `onChange={(event) => updateQuantity(item.offeringId, Number(event.target.value))}`,
      `onChange={(event) =>
                  updateQuantity(
                    cartLineKey(item),
                    Number(event.target.value),
                  )
                }`,
    );

    source = source.replace(
      `onClick={() => remove(item.offeringId)}`,
      `onClick={() => remove(cartLineKey(item))}`,
    );

    return source;
  },
);

// ---------------------------------------------------------
// 8. Server-side size validation and PR/binding persistence
// ---------------------------------------------------------
patch("src/modules/marketplace-commerce/actions.ts", (source) => {
  if (!source.includes("selectedSize: string | null")) {
    source = source.replace(
      `    const quantity = Number(cartItem.quantity);
    const minimum = offering.minimumOrderQty == null ? 0 : Number(offering.minimumOrderQty);`,
      `    const quantity = Number(cartItem.quantity);
    const minimum =
      offering.minimumOrderQty == null
        ? 0
        : Number(offering.minimumOrderQty);

    const selectedSize =
      cartItem.selectedSize?.trim() || null;

    if (
      offering.availableSizes.length > 0 &&
      !selectedSize
    ) {
      throw new Error(
        \`Select a size for \${offering.name}.\`,
      );
    }

    if (
      selectedSize &&
      !offering.availableSizes.includes(
        selectedSize,
      )
    ) {
      throw new Error(
        \`\${selectedSize} is no longer an available size for \${offering.name}.\`,
      );
    }`,
    );

    source = source.replace(
      `      offering,
      quantity,
      unitPrice: Number(offering.unitPrice),`,
      `      offering,
      quantity,
      selectedSize,
      unitPrice: Number(offering.unitPrice),`,
    );

    source = source.replace(
      `            description: line.offering.name,
            category: line.offering.category || null,`,
      `            description: line.selectedSize
              ? \`\${line.offering.name} · Size \${line.selectedSize}\`
              : line.offering.name,
            category: line.offering.category || null,`,
    );

    source = source.replace(
      `          offeringName: line.offering.name,
          sku: line.offering.sku,`,
      `          offeringName: line.offering.name,
          selectedSize: line.selectedSize,
          sku: line.offering.sku,`,
    );

    source = source.replace(
      `          marketplaceLineCount: trustedLines.length,`,
      `          marketplaceLineCount: trustedLines.length,
          selectedSizes: trustedLines
            .filter((line) => line.selectedSize)
            .map((line) => ({
              offeringId: line.offering.id,
              offeringName: line.offering.name,
              selectedSize: line.selectedSize,
              quantity: line.quantity,
            })),`,
    );
  }

  return source;
});

console.log(
  "B13.10.20 marketplace wearable size variants integration complete.",
);
