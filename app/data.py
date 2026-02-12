"""Data loading and summary generation for the availability parquet dataset."""

import pandas as pd
from functools import lru_cache
from app.config import PARQUET_PATH


@lru_cache(maxsize=1)
def load_dataframe() -> pd.DataFrame:
    """Load the parquet file into a pandas DataFrame (cached)."""
    df = pd.read_parquet(PARQUET_PATH)
    # Normalize column names for easier agent usage
    df.columns = [c.strip() for c in df.columns]
    return df


def get_data_summary() -> dict:
    """Generate a human-readable summary of the dataset for the agent context."""
    df = load_dataframe()

    summary = {
        "total_rows": int(len(df)),
        "columns": {
            col: str(df[col].dtype) for col in df.columns
        },
        "date_range": {
            "start": str(df["timestamp"].min()),
            "end": str(df["timestamp"].max()),
        },
        "value_stats": {
            "min": int(df["value"].min()),
            "max": int(df["value"].max()),
            "mean": round(float(df["value"].mean()), 2),
            "std": round(float(df["value"].std()), 2),
        },
        "hour_range": {
            "min": int(df["hour"].min()),
            "max": int(df["hour"].max()),
        },
        "description": (
            "This dataset contains synthetic monitoring data for Rappi visible stores. "
            "Each row represents a measurement taken approximately every 10 seconds. "
            "The 'value' column is the count of visible stores at that timestamp. "
            "The 'hour' column is the hour of the day (0-23). "
            "Data spans from Feb 1 to Feb 11, 2026. "
            "The 'Plot name' is always 'NOW' and the metric is always "
            "'synthetic_monitoring_visible_stores'."
        ),
        "hourly_averages": (
            df.groupby("hour")["value"]
            .mean()
            .round(0)
            .astype(int)
            .to_dict()
        ),
    }
    return summary


def get_summary_text() -> str:
    """Return a formatted text summary for the LLM agent context."""
    s = get_data_summary()
    hourly = "\n".join(
        f"  Hour {h}: avg {v:,} visible stores"
        for h, v in sorted(s["hourly_averages"].items())
    )
    return f"""DATASET SUMMARY
===============
- Total rows: {s['total_rows']:,}
- Columns: {list(s['columns'].keys())}
- Column types: {s['columns']}
- Date range: {s['date_range']['start']} to {s['date_range']['end']}
- Value (visible stores count): min={s['value_stats']['min']:,}, max={s['value_stats']['max']:,}, mean={s['value_stats']['mean']:,.0f}, std={s['value_stats']['std']:,.0f}
- Hour range: {s['hour_range']['min']} to {s['hour_range']['max']}

DESCRIPTION:
{s['description']}

HOURLY AVERAGES:
{hourly}
"""
