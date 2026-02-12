"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, BarChart3, Clock } from "lucide-react";
import type { Summary } from "@/lib/data";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-CO");
}

interface KpiCardsProps {
  summary: Summary | null;
}

export function KpiCards({ summary }: KpiCardsProps) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="h-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const delta = summary.last - summary.first;
  const deltaPercent = summary.first > 0 ? ((delta / summary.first) * 100).toFixed(1) : "0";
  const isPositive = delta >= 0;

  const cards = [
    {
      title: "Tiendas Visibles (Ultimo)",
      value: formatNum(summary.last),
      icon: Activity,
      description: "Ultimo valor registrado",
      accent: true,
    },
    {
      title: "Pico Maximo",
      value: formatNum(summary.max),
      icon: TrendingUp,
      description: `Min: ${formatNum(summary.min)}`,
      accent: false,
    },
    {
      title: "Promedio General",
      value: formatNum(summary.avg),
      icon: BarChart3,
      description: `${summary.totalPoints.toLocaleString("es-CO")} puntos de datos`,
      accent: false,
    },
    {
      title: "Variacion Total",
      value: `${isPositive ? "+" : ""}${deltaPercent}%`,
      icon: isPositive ? TrendingUp : TrendingDown,
      description: `${formatNum(summary.first)} -> ${formatNum(summary.last)}`,
      accent: false,
      positive: isPositive,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={card.accent ? "border-primary/30 bg-primary/5" : ""}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.title}
              </p>
              <card.icon
                className={`h-4 w-4 ${
                  card.accent
                    ? "text-primary"
                    : card.positive !== undefined
                    ? card.positive
                      ? "text-emerald-500"
                      : "text-red-500"
                    : "text-muted-foreground"
                }`}
              />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
