"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface HeatmapPoint {
  day: string;
  hour: number;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapPoint[] | null;
}

function getColor(value: number, min: number, max: number): string {
  if (max === min) return "hsl(24, 100%, 50%)";
  const t = (value - min) / (max - min);
  // gradient from dark to orange
  const l = 20 + t * 40;
  const s = 60 + t * 40;
  return `hsl(24, ${s}%, ${l}%)`;
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  const { grid, days, hours, min, max } = useMemo(() => {
    if (!data || data.length === 0) return { grid: {}, days: [], hours: [], min: 0, max: 0 };
    const grid: Record<string, Record<number, number>> = {};
    const daySet = new Set<string>();
    const hourSet = new Set<number>();
    let min = Infinity, max = -Infinity;
    for (const p of data) {
      daySet.add(p.day);
      hourSet.add(p.hour);
      if (!grid[p.day]) grid[p.day] = {};
      grid[p.day][p.hour] = p.value;
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
    }
    return {
      grid,
      days: Array.from(daySet).sort(),
      hours: Array.from(hourSet).sort((a, b) => a - b),
      min, max,
    };
  }, [data]);

  if (!data) {
    return (
      <Card><CardHeader><CardTitle className="text-base">Heatmap Dia x Hora</CardTitle></CardHeader>
        <CardContent><div className="h-[250px] animate-pulse rounded bg-muted" /></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Heatmap Dia x Hora</CardTitle>
        <CardDescription>Intensidad de tiendas visibles por dia y hora</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="px-1 py-1 text-left text-muted-foreground">Dia</th>
                {hours.map((h) => (
                  <th key={h} className="px-1 py-1 text-center text-muted-foreground">{String(h).padStart(2, "0")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <td className="px-1 py-1 text-muted-foreground whitespace-nowrap">{day}</td>
                  {hours.map((h) => {
                    const val = grid[day]?.[h];
                    return (
                      <td key={h} className="px-0.5 py-0.5">
                        <div
                          className="h-6 w-full rounded-sm flex items-center justify-center text-[10px] text-white/80"
                          style={{ backgroundColor: val != null ? getColor(val, min, max) : "hsl(224, 14%, 14%)" }}
                          title={val != null ? `${day} ${String(h).padStart(2,"0")}:00 → ${val.toLocaleString("es-CO")}` : "Sin datos"}
                        >
                          {val != null ? (val >= 1000 ? `${(val/1000).toFixed(0)}K` : val) : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
