"""Streamlit frontend for the RappiMakers AI Dashboard."""

import streamlit as st
import requests
import json
import plotly.io as pio

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="RappiMakers AI Dashboard",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded",
)

API_URL = "http://localhost:8000"

# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------
with st.sidebar:
    st.image("https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Rappi_logo.svg/512px-Rappi_logo.svg.png", width=150)
    st.title("🚀 RappiMakers")
    st.markdown("**AI-Powered Dashboard**")
    st.divider()

    st.markdown("### 💡 Example queries")
    example_queries = [
        "Show me the trend of visible stores over time",
        "What's the average number of visible stores per hour?",
        "Show the daily average of visible stores",
        "Which hour of the day has the most visible stores?",
        "Show me the distribution of values",
        "Compare the first 3 days vs the last 3 days",
        "Show a heatmap of stores by day and hour",
    ]
    for q in example_queries:
        if st.button(f"📊 {q}", key=q, use_container_width=True):
            st.session_state["prefill_query"] = q

    st.divider()
    st.markdown("### 📋 Dataset Info")
    try:
        resp = requests.get(f"{API_URL}/api/data/summary", timeout=5)
        if resp.ok:
            summary = resp.json()
            st.metric("Total Records", f"{summary['total_rows']:,}")
            st.metric("Date Range", f"{summary['date_range']['start'][:10]} → {summary['date_range']['end'][:10]}")
            st.metric("Max Visible Stores", f"{summary['value_stats']['max']:,.0f}")
        else:
            st.warning("⚠️ API not reachable")
    except requests.exceptions.ConnectionError:
        st.warning("⚠️ Start the API server first:\n`poetry run python -m app.main`")

# ---------------------------------------------------------------------------
# Main content
# ---------------------------------------------------------------------------
st.title("🚀 Rappi Store Availability AI Dashboard")
st.markdown(
    "Ask anything about the store availability data and get instant visualizations. "
    "The AI agent analyzes the data and creates charts for you."
)

st.divider()

# ---------------------------------------------------------------------------
# Chat interface
# ---------------------------------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if "chart" in message and message["chart"]:
            try:
                fig = pio.from_json(message["chart"])
                st.plotly_chart(fig, use_container_width=True)
            except Exception:
                pass

# Handle prefilled query from sidebar
prefill = st.session_state.pop("prefill_query", None)

# Chat input
user_input = st.chat_input("Ask about store availability data...")
query = prefill or user_input

if query:
    # Show user message
    st.session_state.messages.append({"role": "user", "content": query})
    with st.chat_message("user"):
        st.markdown(query)

    # Call the API
    with st.chat_message("assistant"):
        with st.spinner("🤖 Analyzing data and creating visualization..."):
            try:
                # Build chat history for context
                chat_history = [
                    {"role": m["role"], "content": m["content"]}
                    for m in st.session_state.messages[:-1]  # Exclude current
                ]

                response = requests.post(
                    f"{API_URL}/api/query",
                    json={"query": query, "chat_history": chat_history},
                    timeout=120,
                )

                if response.ok:
                    data = response.json()
                    explanation = data.get("explanation", "")
                    chart_json = data.get("chart_json")

                    st.markdown(explanation)

                    if chart_json:
                        try:
                            fig = pio.from_json(chart_json)
                            st.plotly_chart(fig, use_container_width=True)
                        except Exception as e:
                            st.warning(f"Could not render chart: {e}")

                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": explanation,
                        "chart": chart_json,
                    })
                else:
                    error_detail = response.json().get("detail", "Unknown error")
                    st.error(f"❌ API Error: {error_detail}")
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": f"Error: {error_detail}",
                    })

            except requests.exceptions.ConnectionError:
                st.error(
                    "❌ Cannot connect to the API server. "
                    "Make sure it's running with: `poetry run python -m app.main`"
                )
            except requests.exceptions.Timeout:
                st.error("❌ Request timed out. The query might be too complex.")
