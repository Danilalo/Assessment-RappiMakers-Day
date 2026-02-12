import { streamText, convertToModelMessages } from "ai";
import { getSummary, getSourceLabels, loadAllData } from "@/lib/data";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const summary = getSummary();
  const labels = getSourceLabels();
  const { all } = loadAllData();

  // Build a comprehensive data context for the LLM
  const sourceDetails = summary.sources
    .map(
      (s) =>
        `- ${s.label} (${s.date}): ${s.pointCount} puntos, min=${s.min.toLocaleString()}, max=${s.max.toLocaleString()}, promedio=${s.avg.toLocaleString()}, inicio=${s.first.toLocaleString()}, fin=${s.last.toLocaleString()}, tendencia=${((s.last - s.first) / s.first * 100).toFixed(1)}%`
    )
    .join("\n");

  // Sample some recent data points for context
  const recentPoints = all.slice(-30).map(
    (d) => `${d.timestamp}: ${d.value.toLocaleString()} (${d.source})`
  ).join("\n");

  const systemPrompt = `Eres un asistente de datos experto en monitoreo de disponibilidad de tiendas Rappi. Tu trabajo es responder preguntas sobre los datos historicos de disponibilidad de tiendas que se muestran en el dashboard.

CONTEXTO DE LOS DATOS:
- Metrica: synthetic_monitoring_visible_stores (tiendas visibles por monitoreo sintetico)
- Total de puntos de datos: ${summary.totalPoints.toLocaleString()}
- Rango temporal: ${summary.startTime} a ${summary.endTime}
- Valor minimo global: ${summary.min.toLocaleString()}
- Valor maximo global: ${summary.max.toLocaleString()}
- Promedio global: ${summary.avg.toLocaleString()}
- Primer valor: ${summary.first.toLocaleString()}
- Ultimo valor: ${summary.last.toLocaleString()}

VENTANAS DE TIEMPO DISPONIBLES:
${sourceDetails}

ETIQUETAS DE FUENTES: ${labels.join(", ")}

ULTIMOS 30 PUNTOS DE DATOS:
${recentPoints}

NOTAS IMPORTANTES:
- Los datos cubren dos dias: Feb 1, 2026 (dia completo) y Feb 6, 2026 (5 ventanas horarias de 11h a 15h)
- Los valores representan conteos acumulativos de tiendas visibles monitoreadas sinteticamente
- Feb 1 muestra un patron de inicio (ramp-up) desde ~37 tiendas hasta ~19K, luego estabilizacion
- Feb 6 muestra valores mucho mas altos (2.7M - 6.2M) indicando acumulacion continua o mayor escala
- Cada ventana horaria de Feb 6 muestra un patron tipico: subida rapida, estabilizacion, luego variaciones

INSTRUCCIONES:
- Responde siempre en espanol
- Se preciso con los numeros, usa formato con separadores de miles
- Menciona las fuentes de datos cuando sea relevante
- Si no puedes responder algo con los datos disponibles, indicalo
- Usa un tono profesional pero accesible
- Puedes hacer analisis, comparaciones y detectar patrones`;

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
