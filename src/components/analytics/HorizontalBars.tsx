export interface BarDatum {
  label: string;
  value: number;
  detail?: string;
}

export function HorizontalBars({
  data,
  valueFormatter = (value) => value.toLocaleString(),
}: {
  data: BarDatum[];
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-5">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-4 text-sm">
            <div>
              <p className="font-black text-slate-900">{item.label}</p>
              {item.detail ? (
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              ) : null}
            </div>
            <p className="font-black text-blue-700">
              {valueFormatter(item.value)}
            </p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-700"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}

      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No data is available yet.</p>
      ) : null}
    </div>
  );
}
