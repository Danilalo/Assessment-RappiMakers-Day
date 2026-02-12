"use client";

import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  dateStart: string;
  dateEnd: string;
  hourStart: number;
  hourEnd: number;
  onDateStartChange: (v: string) => void;
  onDateEndChange: (v: string) => void;
  onHourStartChange: (v: number) => void;
  onHourEndChange: (v: number) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function DashboardHeader({
  dateStart, dateEnd, hourStart, hourEnd,
  onDateStartChange, onDateEndChange, onHourStartChange, onHourEndChange,
  onRefresh, loading,
}: DashboardHeaderProps) {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Rappi Availability</h1>
            <p className="text-xs text-muted-foreground">Monitoreo de Disponibilidad de Tiendas</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date filters */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">Desde</label>
            <input type="date" value={dateStart} onChange={(e) => onDateStartChange(e.target.value)}
              className="rounded border border-border bg-muted/30 px-2 py-1 text-xs outline-none focus:border-primary/50" />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <input type="date" value={dateEnd} onChange={(e) => onDateEndChange(e.target.value)}
              className="rounded border border-border bg-muted/30 px-2 py-1 text-xs outline-none focus:border-primary/50" />
          </div>

          {/* Hour filters */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">Hora</label>
            <select value={hourStart} onChange={(e) => onHourStartChange(Number(e.target.value))}
              className="rounded border border-border bg-muted/30 px-2 py-1 text-xs outline-none">
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">-</span>
            <select value={hourEnd} onChange={(e) => onHourEndChange(Number(e.target.value))}
              className="rounded border border-border bg-muted/30 px-2 py-1 text-xs outline-none">
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
              ))}
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>
    </header>
  );
}
