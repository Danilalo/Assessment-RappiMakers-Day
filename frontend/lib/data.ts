import fs from "fs";
import path from "path";

export interface DataPoint {
  timestamp: string;
  value: number;
  source: string;
}

export interface SourceStats {
  label: string;
  date: string;
  pointCount: number;
  min: number;
  max: number;
  avg: number;
  first: number;
  last: number;
  startTime: string;
  endTime: string;
}

export interface Summary {
  totalPoints: number;
  min: number;
  max: number;
  avg: number;
  first: number;
  last: number;
  startTime: string;
  endTime: string;
  sources: SourceStats[];
}

const FILES = [
  { file: "feb01-full-day.csv", label: "Feb 01 - Dia Completo", date: "2026-02-01" },
  { file: "feb06-11h.csv", label: "Feb 06 - 11:00h", date: "2026-02-06" },
  { file: "feb06-12h.csv", label: "Feb 06 - 12:00h", date: "2026-02-06" },
  { file: "feb06-13h.csv", label: "Feb 06 - 13:00h", date: "2026-02-06" },
  { file: "feb06-14h.csv", label: "Feb 06 - 14:00h", date: "2026-02-06" },
  { file: "feb06-15h.csv", label: "Feb 06 - 15:00h", date: "2026-02-06" },
];

function parseTimestamp(raw: string): string | null {
  const match = raw.match(
    /(\w+) (\w+) (\d+) (\d+) (\d+):(\d+):(\d+) GMT([+-]\d+)/
  );
  if (!match) return null;

  const [, , monthStr, day, year, hours, minutes, seconds, tz] = match;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const month = months[monthStr];
  if (!month) return null;

  const tzFormatted = tz.slice(0, 3) + ":" + tz.slice(3);
  return `${year}-${month}-${day.padStart(2, "0")}T${hours}:${minutes}:${seconds}${tzFormatted}`;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inParens = 0;
  for (const char of line) {
    if (char === "(") inParens++;
    if (char === ")") inParens--;
    if (char === "," && inParens === 0) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function parseCsvFile(filePath: string): DataPoint[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const values = splitCsvLine(lines[1]);
  const dataPoints: DataPoint[] = [];

  for (let i = 4; i < headers.length; i++) {
    const timestamp = parseTimestamp(headers[i]);
    const value = parseInt(values[i], 10);
    if (timestamp && !isNaN(value)) {
      dataPoints.push({ timestamp, value, source: "" });
    }
  }
  return dataPoints;
}

let cachedData: { all: DataPoint[]; summary: Summary } | null = null;

export function loadAllData(): { all: DataPoint[]; summary: Summary } {
  if (cachedData) return cachedData;

  const rawDir = path.join(process.cwd(), "data/raw");
  const allData: DataPoint[] = [];
  const sourceStats: SourceStats[] = [];

  for (const { file, label, date } of FILES) {
    const filePath = path.join(rawDir, file);
    if (!fs.existsSync(filePath)) continue;

    const points = parseCsvFile(filePath);
    if (points.length === 0) continue;

    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

    sourceStats.push({
      label,
      date,
      pointCount: points.length,
      min,
      max,
      avg,
      first: values[0],
      last: values[values.length - 1],
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
    });

    for (const point of points) {
      allData.push({ ...point, source: label });
    }
  }

  allData.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const allValues = allData.map((d) => d.value);
  const summary: Summary = {
    totalPoints: allData.length,
    min: allValues.length > 0 ? Math.min(...allValues) : 0,
    max: allValues.length > 0 ? Math.max(...allValues) : 0,
    avg: allValues.length > 0 ? Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length) : 0,
    first: allValues[0] ?? 0,
    last: allValues[allValues.length - 1] ?? 0,
    startTime: allData[0]?.timestamp ?? "",
    endTime: allData[allData.length - 1]?.timestamp ?? "",
    sources: sourceStats,
  };

  cachedData = { all: allData, summary };
  return cachedData;
}

export function getSampledData(sampleRate = 6): DataPoint[] {
  const { all } = loadAllData();
  return all.filter((_, i) => i % sampleRate === 0);
}

export function getDataBySource(source: string): DataPoint[] {
  const { all } = loadAllData();
  return all.filter((d) => d.source === source);
}

export function getSummary(): Summary {
  return loadAllData().summary;
}

export function getSourceLabels(): string[] {
  return FILES.map((f) => f.label);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-CO");
}
