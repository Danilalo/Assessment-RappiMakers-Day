import { getSampledData, getSummary, getSourceLabels, getDataBySource } from "@/lib/data";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const source = searchParams.get("source");
  const type = searchParams.get("type") || "sampled";

  if (type === "summary") {
    const summary = getSummary();
    const labels = getSourceLabels();
    return Response.json({ summary, labels });
  }

  if (source && source !== "all") {
    const data = getDataBySource(source);
    // Sample the source data to keep payloads manageable
    const sampled = data.filter((_, i) => i % 3 === 0);
    return Response.json({ data: sampled });
  }

  const data = getSampledData(12);
  return Response.json({ data });
}
