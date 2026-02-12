"""Fast single-call LLM approach: one LLM call returns a chart spec, we build it server-side."""

import json
import traceback
import plotly.express as px
import pandas as pd
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.config import OPENAI_API_KEY, LLM_MODEL, LLM_TEMPERATURE
from app.data import load_dataframe, get_summary_text


# ---------------------------------------------------------------------------
# Chart builder — no LLM, just executes the spec
# ---------------------------------------------------------------------------

def build_chart_from_spec(spec: dict) -> str | None:
    """Build a Plotly chart JSON string from a spec dict produced by the LLM."""
    df = load_dataframe()

    chart_type = spec.get("chart_type", "line")
    title = spec.get("title", "Chart")
    data_code = spec.get("data_code", "df")
    x = spec.get("x", "timestamp")
    y = spec.get("y", "value")
    color = spec.get("color", None)
    labels = spec.get("labels", {})

    try:
        local_ns: dict = {}
        exec(f"__chart_df__ = {data_code}", {"pd": pd, "df": df}, local_ns)
        chart_df = local_ns["__chart_df__"]
    except Exception as e:
        print(f"[chart] data_code error: {e}")
        return None

    chart_fn_map = {
        "line": px.line,
        "bar": px.bar,
        "scatter": px.scatter,
        "area": px.area,
        "histogram": px.histogram,
        "box": px.box,
    }
    chart_fn = chart_fn_map.get(chart_type, px.line)

    try:
        params: dict = {"data_frame": chart_df, "x": x, "y": y, "title": title}
        if labels:
            params["labels"] = labels
        if color:
            params["color"] = color
        fig = chart_fn(**params)
        fig.update_layout(
            template="plotly_white",
            font=dict(family="Inter, sans-serif", size=12),
            title_font_size=16,
            margin=dict(l=40, r=40, t=60, b=40),
        )
        return fig.to_json()
    except Exception as e:
        print(f"[chart] plotting error: {e}")
        return None


# ---------------------------------------------------------------------------
# System prompt — single structured JSON response
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a data visualization expert for Rappi Store Availability monitoring.

DATASET:
{data_summary}

INSTRUCTIONS:
The user asks a question about the data. You must respond with ONLY a valid JSON object (no markdown, no backticks, no extra text) with these fields:

{{"explanation": "A clear 1-3 sentence answer to the user's question.", "chart_spec": {{"chart_type": "bar|line|scatter|area|histogram|box", "title": "Descriptive chart title", "data_code": "pandas code using df to produce the chart DataFrame", "x": "column_name_for_x", "y": "column_name_for_y", "color": null, "labels": {{"x_col": "X Label", "y_col": "Y Label"}}}}}}

COLUMN NAMES: 'Plot name', 'metric (sf_metric)', 'timestamp', 'value', 'hour'

DATA CODE EXAMPLES:
- Hourly avg: df.groupby('hour')['value'].mean().reset_index()
- Time series (1h): df.set_index('timestamp').resample('1h')['value'].mean().reset_index()
- Daily avg: df.set_index('timestamp').resample('1D')['value'].mean().reset_index()
- Peak hour: df.groupby('hour')['value'].mean().reset_index().sort_values('value', ascending=False).head(10)
- Distribution: df[['value']]
- Date + hour: df.assign(date=df['timestamp'].dt.date).groupby(['date','hour'])['value'].mean().reset_index()

RESPOND WITH JSON ONLY. Respond explanation in the same language the user writes in."""


# ---------------------------------------------------------------------------
# Single-call query
# ---------------------------------------------------------------------------

def run_agent_query(user_query: str, chat_history: list | None = None) -> dict:
    """Run a user query with a single LLM call and build chart server-side."""
    llm = ChatOpenAI(
        model=LLM_MODEL,
        temperature=LLM_TEMPERATURE,
        openai_api_key=OPENAI_API_KEY,
    )

    data_summary = get_summary_text()
    system_msg = SYSTEM_PROMPT.replace("{data_summary}", data_summary)

    messages: list = [SystemMessage(content=system_msg)]

    if chat_history:
        for msg in chat_history:
            messages.append(msg)

    messages.append(HumanMessage(content=user_query))

    try:
        response = llm.invoke(messages)
        raw = response.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3].strip()

        parsed = json.loads(raw)
        explanation = parsed.get("explanation", "")
        chart_spec = parsed.get("chart_spec", {})

        chart_json = build_chart_from_spec(chart_spec) if chart_spec else None

        return {
            "explanation": explanation,
            "chart_json": chart_json,
            "error": None,
        }

    except json.JSONDecodeError as e:
        return {
            "explanation": raw if "raw" in dir() else "",
            "chart_json": None,
            "error": f"LLM returned invalid JSON: {e}",
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "explanation": "",
            "chart_json": None,
            "error": str(e),
        }
