"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { savePurchaseRequestAction } from "@/modules/purchase-requests/actions";

type Option = { id: string; name: string };
type Line = {
  description: string;
  category: string;
  quantity: string;
  unitOfMeasure: string;
  unitPrice: string;
  supplierSuggestion: string;
};

const blankLine = (): Line => ({
  description: "",
  category: "",
  quantity: "1",
  unitOfMeasure: "EA",
  unitPrice: "",
  supplierSuggestion: "",
});

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function PurchaseRequestForm({
  baseCurrency,
  legalEntities,
  sites,
  departments,
}: {
  baseCurrency: string;
  legalEntities: Option[];
  sites: Option[];
  departments: Option[];
}) {
  const [lines, setLines] = useState<Line[]>([blankLine()]);

  function updateLine(index: number, key: keyof Line, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    );
  }

  return (
    <form action={savePurchaseRequestAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Request title"><input className={inputClass} name="title" required /></Field>
      <Field label="Priority">
        <select className={inputClass} name="priority" defaultValue="NORMAL">
          <option value="LOW">Low</option><option value="NORMAL">Normal</option>
          <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
        </select>
      </Field>
      <Field label="Needed by"><input className={inputClass} name="neededByDate" type="date" /></Field>
      <Field label="Currency"><input className={inputClass} name="originalCurrency" defaultValue={baseCurrency} maxLength={3} required /></Field>
      <Field label="Rate to USD"><input className={inputClass} name="exchangeRateToUsd" type="number" step="0.000001" defaultValue="1" required /></Field>
      <Field label="Rate source"><input className={inputClass} name="exchangeRateSource" defaultValue="Manual approved rate" required /></Field>
      <ScopeSelect label="Legal entity" name="legalEntityId" options={legalEntities} />
      <ScopeSelect label="Site" name="siteId" options={sites} />
      <ScopeSelect label="Department" name="departmentId" options={departments} />
      <label className="text-sm font-bold text-slate-700 md:col-span-2 xl:col-span-4">
        Business justification
        <textarea className={`${inputClass} min-h-28`} name="businessJustification" required />
      </label>

      <div className="space-y-4 md:col-span-2 xl:col-span-4">
        {lines.map((line, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black">Line {index + 1}</h3>
              {lines.length > 1 ? (
                <button type="button" onClick={() => setLines((items) => items.filter((_, i) => i !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <Field label="Description"><input className={inputClass} name="lineDescription" value={line.description} onChange={(e) => updateLine(index, "description", e.target.value)} required /></Field>
              <Field label="Category"><input className={inputClass} name="lineCategory" value={line.category} onChange={(e) => updateLine(index, "category", e.target.value)} /></Field>
              <Field label="Quantity"><input className={inputClass} name="lineQuantity" type="number" step="0.0001" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} required /></Field>
              <Field label="Unit"><input className={inputClass} name="lineUnitOfMeasure" value={line.unitOfMeasure} onChange={(e) => updateLine(index, "unitOfMeasure", e.target.value)} required /></Field>
              <Field label="Unit price"><input className={inputClass} name="lineUnitPrice" type="number" step="0.0001" value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} required /></Field>
              <Field label="Suggested supplier"><input className={inputClass} name="lineSupplierSuggestion" value={line.supplierSuggestion} onChange={(e) => updateLine(index, "supplierSuggestion", e.target.value)} /></Field>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setLines((items) => [...items, blankLine()])} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700">
          <Plus className="h-4 w-4" /> Add line item
        </button>
      </div>

      <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4">
        <button className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black" name="intent" value="DRAFT">Save draft</button>
        <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-700" name="intent" value="SUBMIT">Submit request</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-700">{label}{children}</label>;
}

function ScopeSelect({ label, name, options }: { label: string; name: string; options: Option[] }) {
  return <Field label={label}><select className={inputClass} name={name} defaultValue=""><option value="">Organization level</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>;
}
