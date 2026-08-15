"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const palette = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#06b6d4", "#f97316"];

function compact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function RevenueTrendChart({ data }: { data: Array<{ month: string; invoiced: number; paid: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={compact} />
        <Tooltip formatter={(value) => compact(Number(value))} />
        <Area type="monotone" dataKey="invoiced" name="Invoiced sales" stroke="#2563eb" fill="#dbeafe" />
        <Area type="monotone" dataKey="paid" name="Paid revenue" stroke="#10b981" fill="#d1fae5" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AgingChart({ data }: { data: Array<{ bucket: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="bucket" />
        <YAxis tickFormatter={compact} />
        <Tooltip formatter={(value) => compact(Number(value))} />
        <Bar dataKey="value" name="Receivables" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BuyerConcentrationChart({ data }: { data: Array<{ buyer: string; invoiced: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={compact} />
        <YAxis type="category" dataKey="buyer" width={130} />
        <Tooltip formatter={(value) => compact(Number(value))} />
        <Bar dataKey="invoiced" name="Invoiced sales" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function InvoiceStatusChart({ data }: { data: Array<{ status: string; count: number; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="status" innerRadius={65} outerRadius={105} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={`${entry.status}-${index}`} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [compact(Number(value)), String(name)]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
