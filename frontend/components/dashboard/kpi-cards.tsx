"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, BarChart3, CheckCircle } from "lucide-react";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-CO");
}

export interface KpiData {
  current_stores: number;
  period_avg: number;
  peak_max: number;
  uptime_pct: number;
}

interface KpiCardsProps {
  kpis: KpiData | null;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const cards = [
    { title: "Tiendas Ahora", value: formatNum(kpis.current_stores), icon: Activity, description: "Ultimo valor registrado", accent: true },
    { title: "Promedio del Periodo", value: formatNum(kpis.period_avg), icon: BarChart3, description: "Promedio en el rango seleccionado", accent: false },
    { title: "Pico Maximo", value: formatNum(kpis.peak_max), icon: TrendingUp, description: "Valor mas alto registrado", accent: false },
    { title: "Uptime %", value: `${kpis.uptime_pct.toFixed(1)}%`, icon: CheckCircle, description: "Porcentaje por encima del umbral", accent: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.accent ? "border-primary/30 bg-primary/5" : ""}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.title}</p>
              <card.icon className={`h-4 w-4 ${card.accent ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
