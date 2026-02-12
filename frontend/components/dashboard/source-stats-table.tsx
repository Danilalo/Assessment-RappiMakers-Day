"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SourceStats } from "@/lib/data";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-CO");
}

interface SourceStatsTableProps {
  sources: SourceStats[] | null;
}

export function SourceStatsTable({ sources }: SourceStatsTableProps) {
  if (!sources) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por Ventana</CardTitle>
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
        <CardTitle className="text-base">Detalle por Ventana de Tiempo</CardTitle>
        <CardDescription>Estadisticas detalladas de cada ventana de monitoreo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Ventana
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Puntos
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Min
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Max
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Promedio
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tendencia
                </th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => {
                const trend = s.last - s.first;
                const trendPercent =
                  s.first > 0 ? ((trend / s.first) * 100).toFixed(1) : "0";
                const isPositive = trend >= 0;

                return (
                  <tr
                    key={s.label}
                    className={`border-b border-border/30 ${
                      i % 2 === 0 ? "" : "bg-muted/30"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-medium">{s.label}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                      {s.pointCount.toLocaleString("es-CO")}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {formatNum(s.min)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {formatNum(s.max)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold">
                      {formatNum(s.avg)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs ${
                          isPositive
                            ? "border-emerald-500/30 text-emerald-500"
                            : "border-red-500/30 text-red-500"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {trendPercent}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
