import fs from "fs";
import path from "path";

const PROJECT_ROOT = "/vercel/share/v0-project";
const RAW_DIR = path.join(PROJECT_ROOT, "data/raw");
const OUTPUT_DIR = path.resolve("output_data");

const FILES = [
  { file: "feb01-full-day.csv", label: "Feb 01 - Dia Completo", date: "2026-02-01" },
  { file: "feb06-11h.csv", label: "Feb 06 - 11:00h", date: "2026-02-06" },
  { file: "feb06-12h.csv", label: "Feb 06 - 12:00h", date: "2026-02-06" },
  { file: "feb06-13h.csv", label: "Feb 06 - 13:00h", date: "2026-02-06" },
  { file: "feb06-14h.csv", label: "Feb 06 - 14:00h", date: "2026-02-06" },
  { file: "feb06-15h.csv", label: "Feb 06 - 15:00h", date: "2026-02-06" },
];

function parseTimestamp(raw) {
  const match = raw.match(
    /(\w+) (\w+) (\d+) (\d+) (\d+):(\d+):(\d+) GMT([+-]\d+)/
  );
  if (!match) return null;

  const [, , monthStr, day, year, hours, minutes, seconds, tz] = match;
  const months = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const month = months[monthStr];
  if (!month) return null;

  const tzFormatted = tz.slice(0, 3) + ":" + tz.slice(3);
  return `${year}-${month}-${day.padStart(2, "0")}T${hours}:${minutes}:${seconds}${tzFormatted}`;
}

function parseCsvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const dataLine = lines[1];

  // Split by comma, handling parentheses in timestamps
  function splitLine(line) {
    const result = [];
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

  const headers = splitLine(headerLine);
  const values = splitLine(dataLine);

  // Skip first 4 columns (Plot name, metric, Value Prefix, Value Suffix)
  const dataPoints = [];
  for (let i = 4; i < headers.length; i++) {
    const timestamp = parseTimestamp(headers[i]);
    const value = parseInt(values[i], 10);
    if (timestamp && !isNaN(value)) {
      dataPoints.push({ timestamp, value });
    }
  }

  return dataPoints;
}

// Main
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const allData = [];
const sourceStats = [];

for (const { file, label, date } of FILES) {
  const filePath = path.join(RAW_DIR, file);
  console.log(`Parsing ${file}...`);
  const points = parseCsvFile(filePath);
  console.log(`  Found ${points.length} data points`);

  if (points.length === 0) continue;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const first = values[0];
  const last = values[values.length - 1];

  sourceStats.push({
    label,
    date,
    pointCount: points.length,
    min,
    max,
    avg,
    first,
    last,
    startTime: points[0].timestamp,
    endTime: points[points.length - 1].timestamp,
  });

  for (const point of points) {
    allData.push({ ...point, source: label });
  }
}

// Sort all data by timestamp
allData.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

// Compute global stats
const allValues = allData.map((d) => d.value);
const globalStats = {
  totalPoints: allData.length,
  min: Math.min(...allValues),
  max: Math.max(...allValues),
  avg: Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length),
  first: allValues[0],
  last: allValues[allValues.length - 1],
  startTime: allData[0].timestamp,
  endTime: allData[allData.length - 1].timestamp,
  sources: sourceStats,
};

// Write full data
fs.writeFileSync(
  path.join(OUTPUT_DIR, "availability.json"),
  JSON.stringify(allData)
);
console.log(`\nWrote ${allData.length} total data points to availability.json`);

// Write summary
fs.writeFileSync(
  path.join(OUTPUT_DIR, "summary.json"),
  JSON.stringify(globalStats, null, 2)
);
console.log("Wrote summary.json");

// Downsampled version (every 6th point = ~1min intervals)
const downsampled = allData.filter((_, i) => i % 6 === 0);
fs.writeFileSync(
  path.join(OUTPUT_DIR, "availability-sampled.json"),
  JSON.stringify(downsampled)
);
console.log(`Wrote ${downsampled.length} sampled data points to availability-sampled.json`);

console.log("\nGlobal Stats:");
console.log(JSON.stringify(globalStats, null, 2));
