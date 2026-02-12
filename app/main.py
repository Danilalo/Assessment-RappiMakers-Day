"""FastAPI application — RappiMakers AI Dashboard Backend."""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

from app.agent import run_agent_query
from app.data import get_data_summary, get_summary_text, load_dataframe
from app.config import API_HOST, API_PORT

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="RappiMakers AI Dashboard API",
    description="AI-powered API for querying and visualizing Rappi store availability data.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    """User query request."""
    query: str
    chat_history: list[dict] | None = None


class QueryResponse(BaseModel):
    """Agent response with optional chart."""
    explanation: str
    chart_json: str | None = None
    error: str | None = None


class DataSummaryResponse(BaseModel):
    """Dataset summary metadata."""
    total_rows: int
    columns: dict[str, str]
    date_range: dict[str, str]
    value_stats: dict[str, float]
    hour_range: dict[str, int]
    description: str
    hourly_averages: dict[int, int]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "RappiMakers AI Dashboard API"}


@app.get("/api/data/summary", response_model=DataSummaryResponse, tags=["Data"])
async def data_summary():
    """Return a structured summary of the availability dataset."""
    try:
        return get_data_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data/summary/text", tags=["Data"])
async def data_summary_text():
    """Return a human-readable text summary of the dataset."""
    try:
        return {"summary": get_summary_text()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/query", response_model=QueryResponse, tags=["Agent"])
async def query_agent(request: QueryRequest):
    """Send a natural language query to the AI agent.

    The agent will analyze the data, create a chart, and return both
    a text explanation and the Plotly chart JSON.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # Convert chat_history dicts to LangChain message format
    chat_history = []
    if request.chat_history:
        from langchain_core.messages import HumanMessage, AIMessage
        for msg in request.chat_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                chat_history.append(HumanMessage(content=content))
            else:
                chat_history.append(AIMessage(content=content))

    result = run_agent_query(request.query, chat_history=chat_history)

    if result["error"]:
        raise HTTPException(status_code=500, detail=result["error"])

    return QueryResponse(
        explanation=result["explanation"],
        chart_json=result["chart_json"],
        error=result["error"],
    )


@app.get("/api/data/preview", tags=["Data"])
async def data_preview(rows: int = 20):
    """Return a preview of the first N rows of the dataset."""
    df = load_dataframe()
    preview = df.head(min(rows, 100))
    # Convert timestamps to strings for JSON serialization
    preview = preview.copy()
    preview["timestamp"] = preview["timestamp"].astype(str)
    return {"data": preview.to_dict(orient="records"), "total_rows": len(df)}


@app.get("/api/data/filtered", tags=["Data"])
async def data_filtered(
    date_start: str | None = None,
    date_end: str | None = None,
    hour_start: int | None = None,
    hour_end: int | None = None,
    resample: str = "10min",
):
    """Return filtered + resampled data for the dashboard charts.

    Query params:
    - date_start/date_end: ISO date strings (e.g. '2026-02-01')
    - hour_start/hour_end: integers 0-23
    - resample: pandas resample frequency (default '10min')
    """
    df = load_dataframe().copy()

    # Apply date filter
    if date_start:
        df = df[df["timestamp"] >= pd.Timestamp(date_start, tz=df["timestamp"].dt.tz)]
    if date_end:
        end_ts = pd.Timestamp(date_end, tz=df["timestamp"].dt.tz) + pd.Timedelta(days=1)
        df = df[df["timestamp"] < end_ts]

    # Apply hour filter
    if hour_start is not None:
        df = df[df["hour"] >= hour_start]
    if hour_end is not None:
        df = df[df["hour"] <= hour_end]

    if len(df) == 0:
        return {"time_series": [], "kpis": {}, "heatmap": [], "hourly_avg": []}

    # --- KPIs ---
    current_value = int(df.iloc[-1]["value"])
    avg_value = round(float(df["value"].mean()), 2)
    max_value = int(df["value"].max())
    std_value = round(float(df["value"].std()), 2)
    # Uptime: % of time value > threshold (mean - 1 std as proxy)
    threshold = max(0, avg_value - std_value)
    uptime_pct = round(float((df["value"] > threshold).mean() * 100), 1)

    kpis = {
        "current": current_value,
        "average": avg_value,
        "peak": max_value,
        "uptime_pct": uptime_pct,
        "threshold": round(threshold, 0),
        "total_records": len(df),
    }

    # --- Time series (resampled) ---
    ts = df.set_index("timestamp")["value"].resample(resample).agg(["mean", "std"]).reset_index()
    ts.columns = ["timestamp", "mean", "std"]
    ts["std"] = ts["std"].fillna(0)
    # 5-min moving average
    ts["ma_5min"] = ts["mean"].rolling(window=max(1, 5 // max(1, int(resample.replace("min", "").replace("h", "60").replace("D", "1440")) if resample[-1] != 's' else 1)), min_periods=1).mean()
    ts["upper"] = ts["mean"] + ts["std"]
    ts["lower"] = (ts["mean"] - ts["std"]).clip(lower=0)
    ts["timestamp"] = ts["timestamp"].astype(str)
    time_series = ts.to_dict(orient="records")

    # --- Heatmap: Day x Hour ---
    df["date"] = df["timestamp"].dt.date.astype(str)
    heatmap_df = df.groupby(["date", "hour"])["value"].mean().reset_index()
    heatmap_df["value"] = heatmap_df["value"].round(0).astype(int)
    heatmap = heatmap_df.to_dict(orient="records")

    # --- Hourly average bar chart ---
    hourly_avg_df = df.groupby("hour")["value"].mean().reset_index()
    hourly_avg_df["value"] = hourly_avg_df["value"].round(0).astype(int)
    hourly_avg = hourly_avg_df.to_dict(orient="records")

    return {
        "time_series": time_series,
        "kpis": kpis,
        "heatmap": heatmap,
        "hourly_avg": hourly_avg,
    }


# ---------------------------------------------------------------------------
# Run with uvicorn
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=True)
