"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function LiquidityForecastChart({
  data,
}: {
  data: Array<{
    date: string;
    inflows: number;
    outflows: number;
    projectedCash: number;
  }>;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={24} />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="projectedCash"
            name="Projected cash"
            stroke="#0f172a"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LiquidityScenarioChart({
  scenarios,
}: {
  scenarios: Array<{
    name: string;
    series: Array<{
      date: string;
      projectedCash: number;
    }>;
  }>;
}) {
  const dates =
    scenarios[0]?.series.map((item) => item.date) ?? [];

  const data = dates.map((date, index) => {
    const row: Record<string, string | number> = {
      date,
    };

    for (const scenario of scenarios.slice(0, 5)) {
      row[scenario.name] =
        scenario.series[index]?.projectedCash ?? 0;
    }

    return row;
  });

  const strokes = [
    "#0f172a",
    "#2563eb",
    "#dc2626",
    "#16a34a",
    "#7c3aed",
  ];

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={24} />
          <YAxis />
          <Tooltip />
          {scenarios.slice(0, 5).map((scenario, index) => (
            <Line
              key={scenario.name}
              type="monotone"
              dataKey={scenario.name}
              stroke={strokes[index % strokes.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
