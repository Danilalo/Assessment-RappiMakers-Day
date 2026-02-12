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
import type { SourceStats } from "@/lib/data";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

const COLORS = [
  "hsl(24, 100%, 50%)",
  "hsl(199, 89%, 48%)",
  "hsl(160, 60%, 45%)",
  "hsl(270, 60%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(45, 90%, 50%)",
];

interface SourceComparisonChartProps {
  sources: SourceStats[] | null;
}

export function SourceComparisonChart({ sources }: SourceComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!sources) return [];
    return sources.map((s) => ({
      name: s.label.replace("Feb ", "").replace(" - ", "\n"),
      shortName: s.label.includes("Dia") ? "01 Full" : s.label.split(" - ")[1],
      avg: s.avg,
      max: s.max,
      min: s.min,
      points: s.pointCount,
    }));
  }, [sources]);

  if (!sources) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparacion por Ventana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comparacion por Ventana</CardTitle>
        <CardDescription>Promedio de tiendas visibles por ventana de tiempo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(224, 14%, 18%)"
                strokeOpacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 11, fill: "hsl(220, 10%, 55%)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatNum}
                tick={{ fontSize: 11, fill: "hsl(220, 10%, 55%)" }}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(224, 18%, 12%)",
                  border: "1px solid hsl(224, 14%, 20%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(220, 14%, 96%)",
                }}
                formatter={(val: number, name: string) => [
                  val.toLocaleString("es-CO"),
                  name === "avg" ? "Promedio" : name === "max" ? "Maximo" : "Minimo",
                ]}
              />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
