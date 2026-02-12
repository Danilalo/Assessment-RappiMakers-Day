"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface DynamicChartProps {
  chartJson: string | null;
}

export function DynamicChart({ chartJson }: DynamicChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartJson || !containerRef.current) return;

    // Dynamically load Plotly from CDN if not already loaded
    const renderChart = () => {
      try {
        const parsed = JSON.parse(chartJson);
        const data = parsed.data || [];
        const layout = {
          ...(parsed.layout || {}),
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "hsl(220, 14%, 76%)", size: 12 },
          margin: { t: 40, r: 20, b: 40, l: 50 },
          autosize: true,
        };
        // @ts-expect-error Plotly loaded via CDN
        if (window.Plotly) {
          // @ts-expect-error Plotly loaded via CDN
          window.Plotly.newPlot(containerRef.current, data, layout, { responsive: true, displayModeBar: false });
        }
      } catch {
        if (containerRef.current) {
          containerRef.current.innerHTML = '<p class="text-xs text-muted-foreground p-4">Error al renderizar el grafico</p>';
        }
      }
    };

    // @ts-expect-error Plotly loaded via CDN
    if (window.Plotly) {
      renderChart();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.plot.ly/plotly-2.35.0.min.js";
      script.onload = renderChart;
      document.head.appendChild(script);
    }
  }, [chartJson]);

  if (!chartJson) {
    return (
      <Card className="flex h-full items-center justify-center">
        <CardContent className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            Haz una pregunta al chatbot para generar un grafico aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Grafico del Chatbot</CardTitle>
        <CardDescription>Generado por el agente de IA</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div ref={containerRef} className="h-full min-h-[300px]" />
      </CardContent>
    </Card>
  );
}
