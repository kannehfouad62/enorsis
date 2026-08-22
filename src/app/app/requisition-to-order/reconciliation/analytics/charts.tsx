"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const palette = [
  "#0f172a",
  "#2563eb",
  "#f59e0b",
  "#dc2626",
  "#64748b",
];

export function ReconciliationClassificationChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            outerRadius={105}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={palette[index % palette.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExceptionAgingChart({
  data,
}: {
  data: Array<{ bucket: string; count: number; value: number }>;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bucket" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" name="Open exceptions" fill="#0f172a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReconciliationTrendChart({
  data,
}: {
  data: Array<{
    month: string;
    reconciled: number;
    matched: number;
    exceptions: number;
    variance: number;
  }>;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="reconciled"
            name="Reconciled"
            stroke="#0f172a"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="matched"
            name="Matched"
            stroke="#2563eb"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="exceptions"
            name="Exceptions"
            stroke="#dc2626"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatementImportPerformanceChart({
  data,
}: {
  data: Array<{
    label: string;
    matched: number;
    exceptions: number;
    total: number;
  }>;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="matched" name="Matched rows" fill="#2563eb" />
          <Bar dataKey="exceptions" name="Exception rows" fill="#dc2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
