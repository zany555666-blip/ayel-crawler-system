"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#ffffff", "#30d158", "#ff9f0a", "#ff453a", "#bf5af2", "#5ac8fa", "#ff375f"];

interface SimpleData {
  name: string;
  value: number;
}

export function SimpleBarChart({ data }: { data: SimpleData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="40%">
        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--sub)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--sub)" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            background: "var(--surface2)",
            border: "1px solid #333",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            fontSize: 12,
            color: "var(--fg)",
          }}
        />
        <Bar dataKey="value" fill="#ffffff" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleLineChart({ data }: { data: SimpleData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--sub)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--sub)" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            background: "var(--surface2)",
            border: "1px solid #333",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            fontSize: 12,
            color: "var(--fg)",
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#ffffff"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: "var(--fg)", stroke: "var(--bg)", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SimplePieChart({ data }: { data: SimpleData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={95}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            background: "var(--surface2)",
            border: "1px solid #333",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            fontSize: 12,
            color: "var(--fg)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, change, icon }: StatCardProps) {
  const isPositive = change?.startsWith("+");
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 hover:border-[var(--sub)] transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{title}</p>
          <p className="text-[26px] font-bold text-[var(--fg)] mt-1.5 tracking-tight">{value}</p>
          {change && (
            <p
              className={`text-[12px] font-medium mt-1 ${
                isPositive ? "text-[var(--ok)]" : "text-[var(--err)]"
              }`}
            >
              {change} <span className="text-[var(--sub)] font-normal">vs 上月</span>
            </p>
          )}
        </div>
        {icon && <div className="text-[var(--fg)]">{icon}</div>}
      </div>
    </div>
  );
}
