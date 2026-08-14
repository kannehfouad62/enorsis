"use client";

import { useMemo, useState } from "react";
import { createWarehouseReceivingSessionAction } from "@/modules/warehouse-operations/actions";

export type MarketplaceInboundLine = {
  key: string;
  orderId: string;
  orderNumber: string;
  purchaseRequestId: string;
  purchaseOrderExecutionId: string | null;
  buyerSupplierId: string | null;
  sellerTenantId: string;
  sellerName: string | null;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  expectedDeliveryAt: string | null;
  offeringId: string;
  offeringName: string;
  sku: string | null;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  currencyCode: string;
};

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export function MarketplaceInboundReceivingForm({
  lines,
}: {
  lines: MarketplaceInboundLine[];
}) {
  const [selectedKey, setSelectedKey] = useState("");

  const selected = useMemo(
    () => lines.find((line) => line.key === selectedKey) ?? null,
    [lines, selectedKey],
  );

  return (
    <form
      action={createWarehouseReceivingSessionAction}
      className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <label className="md:col-span-2 xl:col-span-4">
        <span className="text-sm font-bold">
          Accepted / shipped marketplace product
        </span>
        <select
          className={input}
          value={selectedKey}
          onChange={(event) => setSelectedKey(event.target.value)}
        >
          <option value="">Select accepted supplier product</option>
          {lines.map((line) => (
            <option key={line.key} value={line.key}>
              {line.orderNumber} · {line.offeringName}
              {line.sku ? ` · ${line.sku}` : ""} · Qty {line.quantity}{" "}
              {line.unitOfMeasure} · {line.status}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-slate-500">
          Selecting an order line prefills the governed purchasing and shipment
          context. Confirm the physical quantity/condition and add inventory,
          serial or lot details at receipt.
        </span>
      </label>

      <input type="hidden" name="sourceType" value="MARKETPLACE_ORDER" />
      <input type="hidden" name="sourceId" value={selected?.orderId ?? ""} />
      <input
        type="hidden"
        name="purchaseOrderId"
        value={selected?.purchaseOrderExecutionId ?? ""}
      />
      <input
        type="hidden"
        name="supplierId"
        value={selected?.buyerSupplierId ?? ""}
      />
      <input
        type="hidden"
        name="lineReference"
        value={
          selected
            ? `${selected.orderNumber}:${selected.sku ?? selected.offeringId}`
            : ""
        }
      />
      <input
        type="hidden"
        name="description"
        value={selected?.offeringName ?? ""}
      />
      <input
        type="hidden"
        name="expectedQuantity"
        value={selected?.quantity ?? ""}
      />
      <input
        type="hidden"
        name="unitOfMeasure"
        value={selected?.unitOfMeasure ?? "EA"}
      />
      <input
        type="hidden"
        name="carrierReference"
        value={selected?.carrier ?? ""}
      />
      <input
        type="hidden"
        name="deliveryReference"
        value={selected?.trackingNumber ?? ""}
      />

      <ReadOnly
        label="Purchase / seller order"
        value={selected?.orderNumber ?? "Select a product above"}
      />
      <ReadOnly
        label="Supplier"
        value={selected?.sellerName ?? "—"}
      />
      <ReadOnly
        label="Product description"
        value={selected?.offeringName ?? "—"}
      />
      <ReadOnly
        label="Expected quantity"
        value={
          selected
            ? `${selected.quantity} ${selected.unitOfMeasure}`
            : "—"
        }
      />
      <ReadOnly
        label="Carrier / tracking"
        value={
          selected
            ? [selected.carrier, selected.trackingNumber]
                .filter(Boolean)
                .join(" · ") || "Not yet shipped"
            : "—"
        }
      />
      <ReadOnly
        label="Expected delivery"
        value={
          selected?.expectedDeliveryAt
            ? new Date(selected.expectedDeliveryAt).toLocaleString()
            : "Not provided"
        }
      />

      <label>
        <span className="text-sm font-bold">Inventory item ID</span>
        <input
          className={input}
          name="inventoryItemId"
          required
          placeholder="Map to buyer inventory item"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Use the buyer tenant's internal inventory item identifier. Marketplace
          product identity is preserved separately in the source reference.
        </span>
      </label>

      <label>
        <span className="text-sm font-bold">Received quantity</span>
        <input
          className={input}
          name="receivedQuantity"
          type="number"
          min="0"
          step="0.0001"
          required
          defaultValue={selected?.quantity ?? ""}
          key={`received-${selectedKey}`}
        />
      </label>

      <label>
        <span className="text-sm font-bold">Condition</span>
        <select className={input} name="condition" defaultValue="RECEIVED">
          <option value="RECEIVED">Received</option>
          <option value="DAMAGED">Damaged</option>
          <option value="REJECTED">Rejected</option>
          <option value="QUARANTINED">Quarantined</option>
        </select>
      </label>

      <label>
        <span className="text-sm font-bold">Serial / lot reference</span>
        <input
          className={input}
          name="serialLotReference"
          placeholder="Serial, batch or lot"
        />
      </label>

      <label>
        <span className="text-sm font-bold">Dock location ID</span>
        <input
          className={input}
          name="dockLocationId"
          placeholder="Receiving dock / staging location"
        />
      </label>

      <input type="hidden" name="goodsReceiptSessionId" value="" />

      <button
        disabled={!selected}
        className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50"
      >
        Record marketplace receiving
      </button>
    </form>
  );
}

function ReadOnly({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}
