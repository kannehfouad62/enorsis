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
