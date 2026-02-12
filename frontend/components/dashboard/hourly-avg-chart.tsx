"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface HourlyAvgPoint {
  hour: number;
  avg_value: number;
}

interface HourlyAvgChartProps {
  data: HourlyAvgPoint[] | null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function getBarColor(value: number, min: number, max: number): string {
  if (max === min) return "hsl(24, 100%, 50%)";
  const t = (value - min) / (max - min);
  // low = cool blue, high = warm orange
  const hue = 200 - t * 176; // 200 → 24
  return `hsl(${hue}, 80%, 55%)`;
}

export function HourlyAvgChart({ data }: HourlyAvgChartProps) {
  const { chartData, min, max } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], min: 0, max: 0 };
    const sorted = [...data].sort((a, b) => a.hour - b.hour);
    const vals = sorted.map((d) => d.avg_value);
    return { chartData: sorted, min: Math.min(...vals), max: Math.max(...vals) };
  }, [data]);

  if (!data) {
    return (
      <Card><CardHeader><CardTitle className="text-base">Promedio por Hora</CardTitle></CardHeader>
        <CardContent><div className="h-[250px] animate-pulse rounded bg-muted" /></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Promedio por Hora</CardTitle>
        <CardDescription>Promedio de tiendas visibles por hora del dia (gradiente de color)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 14%, 18%)" strokeOpacity={0.5} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h) => `${String(h).padStart(2, "0")}h`}
                tick={{ fontSize: 11, fill: "hsl(220, 10%, 55%)" }}
                tickLine={false} axisLine={false}
              />
              <YAxis tickFormatter={formatNum} tick={{ fontSize: 11, fill: "hsl(220, 10%, 55%)" }} tickLine={false} axisLine={false} width={55} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(224, 18%, 12%)", border: "1px solid hsl(224, 14%, 20%)", borderRadius: "8px", fontSize: "12px", color: "hsl(220, 14%, 96%)" }}
                formatter={(val: number) => [val.toLocaleString("es-CO"), "Promedio"]}
                labelFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
              />
              <Bar dataKey="avg_value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={getBarColor(entry.avg_value, min, max)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
