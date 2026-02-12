"use client";

import { useState, useCallback, useEffect } from "react";
import { DashboardHeader } from "./dashboard-header";
import { KpiCards } from "./kpi-cards";
import { AvailabilityChart } from "./availability-chart";
import { Chatbot } from "./chatbot";
import { DynamicChart } from "./dynamic-chart";
import { HeatmapChart } from "./heatmap-chart";
import { HourlyAvgChart } from "./hourly-avg-chart";
import type { KpiData } from "./kpi-cards";
import type { TimeSeriesPoint } from "./availability-chart";
import type { HeatmapPoint } from "./heatmap-chart";
import type { HourlyAvgPoint } from "./hourly-avg-chart";

interface FilteredData {
  kpis: KpiData;
  time_series: TimeSeriesPoint[];
  heatmap: HeatmapPoint[];
  hourly_avg: HourlyAvgPoint[];
}

export function DashboardContent() {
  const [dateStart, setDateStart] = useState("2026-02-01");
  const [dateEnd, setDateEnd] = useState("2026-02-11");
  const [hourStart, setHourStart] = useState(0);
  const [hourEnd, setHourEnd] = useState(23);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FilteredData | null>(null);
  const [chatChart, setChatChart] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date_start: dateStart,
        date_end: dateEnd,
        hour_start: hourStart.toString(),
        hour_end: hourEnd.toString(),
        resample: "5min",
      });
      const res = await fetch(`/api/data/filtered?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd, hourStart, hourEnd]);

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <>
      <DashboardHeader
        dateStart={dateStart} dateEnd={dateEnd}
        hourStart={hourStart} hourEnd={hourEnd}
        onDateStartChange={setDateStart} onDateEndChange={setDateEnd}
        onHourStartChange={setHourStart} onHourEndChange={setHourEnd}
        onRefresh={fetchData} loading={loading}
      />
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <KpiCards kpis={data?.kpis ?? null} />

        {/* Main Time Series Chart */}
        <AvailabilityChart
          data={data?.time_series ?? null}
          title="Tiendas Visibles en el Tiempo"
          description="Linea principal con banda ±1 std dev y media movil 5min"
        />

        {/* Chatbot + Dynamic Chart */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-h-[450px]">
            <Chatbot onChartUpdate={setChatChart} />
          </div>
          <div className="min-h-[450px]">
            <DynamicChart chartJson={chatChart} />
          </div>
        </div>

        {/* Bottom row: Heatmap + Hourly Avg */}
        <div className="grid gap-4 lg:grid-cols-2">
          <HeatmapChart data={data?.heatmap ?? null} />
          <HourlyAvgChart data={data?.hourly_avg ?? null} />
        </div>
      </div>
    </>
  );
}
