"use client";

import { useState } from "react";
import useSWR from "swr";
import { KpiCards } from "./kpi-cards";
import { AvailabilityChart } from "./availability-chart";
import { SourceComparisonChart } from "./source-comparison-chart";
import { SourceStatsTable } from "./source-stats-table";
import { SourceFilter } from "./source-filter";
import type { DataPoint, Summary } from "@/lib/data";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DashboardContent() {
  const [selectedSource, setSelectedSource] = useState("all");

  const { data: summaryData } = useSWR<{ summary: Summary; labels: string[] }>(
    "/api/data?type=summary",
    fetcher
  );

  const { data: chartResponse } = useSWR<{ data: DataPoint[] }>(
    selectedSource === "all"
      ? "/api/data?type=sampled"
      : `/api/data?source=${encodeURIComponent(selectedSource)}`,
    fetcher
  );

  const summary = summaryData?.summary ?? null;
  const labels = summaryData?.labels ?? [];
  const chartData = chartResponse?.data ?? null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* KPI Cards */}
      <KpiCards summary={summary} />

      {/* Filter Bar */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {selectedSource === "all"
            ? "Vista general de todas las ventanas"
            : `Filtrando: ${selectedSource}`}
        </h2>
        <SourceFilter labels={labels} value={selectedSource} onChange={setSelectedSource} />
      </div>

      {/* Main Chart */}
      <div className="mt-4">
        <AvailabilityChart
          data={chartData}
          title={
            selectedSource === "all"
              ? "Tiendas Visibles - Todas las Ventanas"
              : `Tiendas Visibles - ${selectedSource}`
          }
          description={
            selectedSource === "all"
              ? "Vista consolidada de todas las ventanas de monitoreo"
              : `Datos de la ventana ${selectedSource}`
          }
        />
      </div>

      {/* Bottom row: Comparison + Table */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SourceComparisonChart sources={summary?.sources ?? null} />
        <SourceStatsTable sources={summary?.sources ?? null} />
      </div>
    </div>
  );
}
