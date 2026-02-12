"""Tests for the RappiMakers AI Dashboard."""

import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.data import load_dataframe, get_data_summary, get_summary_text
from app.agent import build_chart_from_spec


# ---------------------------------------------------------------------------
# Test client
# ---------------------------------------------------------------------------
client = TestClient(app)


# ===========================================================================
# DATA MODULE TESTS
# ===========================================================================

class TestDataModule:
    """Tests for app.data module."""

    def test_load_dataframe_returns_dataframe(self):
        """Test that load_dataframe returns a valid pandas DataFrame."""
        # Clear cache so it reloads
        load_dataframe.cache_clear()
        df = load_dataframe()
        assert len(df) > 0
        assert "timestamp" in df.columns
        assert "value" in df.columns
        assert "hour" in df.columns

    def test_load_dataframe_correct_shape(self):
        """Test DataFrame has the expected number of columns."""
        df = load_dataframe()
        assert len(df.columns) == 5

    def test_load_dataframe_no_nulls_in_key_columns(self):
        """Test that key columns have no null values."""
        df = load_dataframe()
        assert df["timestamp"].notna().all()
        assert df["value"].notna().all()
        assert df["hour"].notna().all()

    def test_get_data_summary_structure(self):
        """Test that get_data_summary returns the expected structure."""
        summary = get_data_summary()
        assert "total_rows" in summary
        assert "columns" in summary
        assert "date_range" in summary
        assert "value_stats" in summary
        assert "hour_range" in summary
        assert "description" in summary
        assert "hourly_averages" in summary
        assert summary["total_rows"] > 0

    def test_get_data_summary_date_range(self):
        """Test that date range has start and end."""
        summary = get_data_summary()
        assert "start" in summary["date_range"]
        assert "end" in summary["date_range"]

    def test_get_data_summary_value_stats(self):
        """Test that value stats have expected keys."""
        summary = get_data_summary()
        for key in ["min", "max", "mean", "std"]:
            assert key in summary["value_stats"]
        assert summary["value_stats"]["min"] >= 0

    def test_get_summary_text_is_string(self):
        """Test that get_summary_text returns a non-empty string."""
        text = get_summary_text()
        assert isinstance(text, str)
        assert len(text) > 100
        assert "DATASET SUMMARY" in text


# ===========================================================================
# CHART BUILDER TESTS
# ===========================================================================

class TestChartBuilder:
    """Tests for build_chart_from_spec (no LLM calls)."""

    def test_line_chart(self):
        """Test line chart generation."""
        spec = {
            "chart_type": "line",
            "title": "Test Line Chart",
            "data_code": "df.groupby('hour')['value'].mean().reset_index()",
            "x": "hour",
            "y": "value",
        }
        result = build_chart_from_spec(spec)
        assert result is not None
        parsed = json.loads(result)
        assert "data" in parsed

    def test_bar_chart(self):
        """Test bar chart generation."""
        spec = {
            "chart_type": "bar",
            "title": "Test Bar Chart",
            "data_code": "df.groupby('hour')['value'].mean().reset_index()",
            "x": "hour",
            "y": "value",
        }
        result = build_chart_from_spec(spec)
        assert result is not None
        parsed = json.loads(result)
        assert "data" in parsed

    def test_invalid_data_code_returns_none(self):
        """Test that bad data_code returns None gracefully."""
        spec = {
            "chart_type": "line",
            "title": "Bad",
            "data_code": "df.nonexistent()",
            "x": "hour",
            "y": "value",
        }
        result = build_chart_from_spec(spec)
        assert result is None

    def test_chart_with_labels(self):
        """Test chart with custom labels."""
        spec = {
            "chart_type": "bar",
            "title": "Labeled Chart",
            "data_code": "df.groupby('hour')['value'].mean().reset_index()",
            "x": "hour",
            "y": "value",
            "labels": {"hour": "Hour of Day", "value": "Avg Visible Stores"},
        }
        result = build_chart_from_spec(spec)
        assert result is not None
        parsed = json.loads(result)
        assert parsed["layout"]["title"]["text"] == "Labeled Chart"

    def test_scatter_chart(self):
        """Test scatter chart generation."""
        spec = {
            "chart_type": "scatter",
            "title": "Scatter",
            "data_code": "df.sample(100, random_state=42)",
            "x": "hour",
            "y": "value",
        }
        result = build_chart_from_spec(spec)
        assert result is not None

    def test_histogram_chart(self):
        """Test histogram chart generation."""
        spec = {
            "chart_type": "histogram",
            "title": "Distribution",
            "data_code": "df[['value']].head(1000)",
            "x": "value",
            "y": "value",
        }
        result = build_chart_from_spec(spec)
        assert result is not None

    def test_time_series_resample(self):
        """Test a time series with resample."""
        spec = {
            "chart_type": "line",
            "title": "Hourly Trend",
            "data_code": "df.set_index('timestamp').resample('1h')['value'].mean().reset_index()",
            "x": "timestamp",
            "y": "value",
        }
        result = build_chart_from_spec(spec)
        assert result is not None


# ===========================================================================
# API ENDPOINT TESTS
# ===========================================================================

class TestAPIEndpoints:
    """Tests for the FastAPI endpoints."""

    def test_health_check(self):
        """Test the root health check endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_data_summary(self):
        """Test the data summary endpoint."""
        response = client.get("/api/data/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_rows"] > 0
        assert "columns" in data
        assert "date_range" in data

    def test_data_summary_text(self):
        """Test the text summary endpoint."""
        response = client.get("/api/data/summary/text")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "DATASET SUMMARY" in data["summary"]

    def test_data_preview(self):
        """Test the data preview endpoint."""
        response = client.get("/api/data/preview?rows=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 5
        assert data["total_rows"] > 0

    def test_data_preview_default(self):
        """Test the data preview with default rows."""
        response = client.get("/api/data/preview")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 20

    def test_query_empty(self):
        """Test that empty query returns 400."""
        response = client.post("/api/query", json={"query": ""})
        assert response.status_code == 400

    def test_query_whitespace_only(self):
        """Test that whitespace-only query returns 400."""
        response = client.post("/api/query", json={"query": "   "})
        assert response.status_code == 400

    @patch("app.main.run_agent_query")
    def test_query_success_mock(self, mock_agent):
        """Test successful query endpoint with mocked agent."""
        mock_agent.return_value = {
            "explanation": "Here is the trend of visible stores.",
            "chart_json": '{"data": [{"x": [1,2,3], "y": [100,200,300]}], "layout": {"title": "Test"}}',
            "error": None,
        }
        response = client.post("/api/query", json={"query": "Show me the trend"})
        assert response.status_code == 200
        data = response.json()
        assert data["explanation"] == "Here is the trend of visible stores."
        assert data["chart_json"] is not None

    @patch("app.main.run_agent_query")
    def test_query_agent_error(self, mock_agent):
        """Test query endpoint when agent returns an error."""
        mock_agent.return_value = {
            "explanation": "",
            "chart_json": None,
            "error": "LLM API key not set",
        }
        response = client.post("/api/query", json={"query": "Show me data"})
        assert response.status_code == 500

    @patch("app.main.run_agent_query")
    def test_query_with_chat_history(self, mock_agent):
        """Test query with chat history."""
        mock_agent.return_value = {
            "explanation": "Follow-up answer",
            "chart_json": None,
            "error": None,
        }
        response = client.post("/api/query", json={
            "query": "And now group by day",
            "chat_history": [
                {"role": "user", "content": "Show the hourly trend"},
                {"role": "assistant", "content": "Here is the hourly trend."},
            ],
        })
        assert response.status_code == 200


# ===========================================================================
# INTEGRATION TESTS (chart pipeline, no LLM)
# ===========================================================================

class TestChartPipeline:
    """Test the full chart creation pipeline without LLM calls."""

    def test_hourly_average_chart(self):
        """Test creating an hourly average chart end-to-end."""
        spec = {
            "chart_type": "bar",
            "title": "Average Visible Stores by Hour",
            "data_code": "df.groupby('hour')['value'].mean().reset_index()",
            "x": "hour",
            "y": "value",
            "labels": {"hour": "Hour of Day", "value": "Avg Visible Stores"},
        }
        result = build_chart_from_spec(spec)
        fig_data = json.loads(result)

        assert "data" in fig_data
        assert "layout" in fig_data
        assert fig_data["layout"]["title"]["text"] == "Average Visible Stores by Hour"

    def test_time_series_chart(self):
        """Test creating a resampled time series chart."""
        spec = {
            "chart_type": "line",
            "title": "Hourly Trend of Visible Stores",
            "data_code": "df.set_index('timestamp').resample('1h')['value'].mean().reset_index()",
            "x": "timestamp",
            "y": "value",
        }
        result = build_chart_from_spec(spec)
        fig_data = json.loads(result)

        assert "data" in fig_data
        assert "layout" in fig_data

    def test_scatter_chart(self):
        """Test creating a scatter plot."""
        spec = {
            "chart_type": "scatter",
            "title": "Value vs Hour",
            "data_code": "df.sample(500, random_state=42)",
            "x": "hour",
            "y": "value",
        }
        result = build_chart_from_spec(spec)
        fig_data = json.loads(result)

        assert "data" in fig_data
        assert "error" not in fig_data

    def test_histogram_chart(self):
        """Test creating a histogram."""
        spec = {
            "chart_type": "histogram",
            "title": "Distribution of Values",
            "data_code": "df",
            "x": "value",
            "y": "value",
        }
        result = build_chart_from_spec(spec)
        fig_data = json.loads(result)

        assert "data" in fig_data
