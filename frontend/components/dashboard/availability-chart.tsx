"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { DataPoint } from "@/lib/data";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

interface AvailabilityChartProps {
  data: DataPoint[] | null;
  title?: string;
  description?: string;
}

export function AvailabilityChart({
  data,
  title = "Tiendas Visibles en el Tiempo",
  description = "Monitoreo sintetico de tiendas disponibles",
}: AvailabilityChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      fullTime: new Date(d.timestamp).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      value: d.value,
      source: d.source,
    }));
  }, [data]);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
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
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(224, 14%, 18%)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "hsl(220, 10%, 55%)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={60}
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
                formatter={(val: number) => [val.toLocaleString("es-CO"), "Tiendas"]}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullTime;
                  }
                  return "";
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(24, 100%, 50%)"
                strokeWidth={2}
                fill="url(#colorValue)"
                dot={false}
                activeDot={{ r: 4, fill: "hsl(24, 100%, 50%)", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
