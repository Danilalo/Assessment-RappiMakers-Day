"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  mean: number;
  std: number;
  ma_5min: number;
  upper: number;
  lower: number;
}

interface AvailabilityChartProps {
  data: TimeSeriesPoint[] | null;
  title?: string;
  description?: string;
}

export function AvailabilityChart({
  data,
  title = "Tiendas Visibles en el Tiempo",
  description = "Linea principal con banda ±1 std dev y media movil 5min",
}: AvailabilityChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      fullTime: new Date(d.timestamp).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      value: d.value,
      ma_5min: d.ma_5min,
      upper: d.upper,
      lower: d.lower,
      band: [d.lower, d.upper],
    }));
  }, [data]);

  if (!data) {
    return (
      <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
        <CardContent><div className="h-[350px] animate-pulse rounded bg-muted" /></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 14%, 18%)" strokeOpacity={0.5} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(220, 10%, 55%)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={60} />
              <YAxis tickFormatter={formatNum} tick={{ fontSize: 11, fill: "hsl(220, 10%, 55%)" }} tickLine={false} axisLine={false} width={55} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(224, 18%, 12%)", border: "1px solid hsl(224, 14%, 20%)", borderRadius: "8px", fontSize: "12px", color: "hsl(220, 14%, 96%)" }}
                formatter={(val: number, name: string) => {
                  const labels: Record<string, string> = { value: "Tiendas", ma_5min: "MA 5min", upper: "Upper band", lower: "Lower band" };
                  return [val?.toLocaleString("es-CO") ?? "-", labels[name] || name];
                }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? ""}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {/* ±1 std band */}
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandFill)" fillOpacity={1} name="Upper band" legendType="none" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(224, 18%, 12%)" fillOpacity={1} name="Lower band" legendType="none" />
              {/* Main line */}
              <Line type="monotone" dataKey="value" stroke="hsl(24, 100%, 50%)" strokeWidth={2} dot={false} name="Tiendas" activeDot={{ r: 4 }} />
              {/* Moving average */}
              <Line type="monotone" dataKey="ma_5min" stroke="hsl(200, 80%, 60%)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="MA 5min" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
