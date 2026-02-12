import streamlit as st
import pandas as pd
import plotly.express as px
from langchain_openai import ChatOpenAI
from langchain_experimental.agents import create_pandas_dataframe_agent

# 1. Configuración de la página (UX/Creatividad)
st.set_page_config(page_title="RappiMakers AI Dashboard", layout="wide")

st.title("🚀 Rappi Store Availability Al-Powered Dashboard")
st.markdown("Analiza la disponibilidad de tiendas y consulta al asistente inteligente.")

# 2. Carga de Datos (Contexto)
# Como se mencionó antes, usaremos el CSV proporcionado para el análisis
@st.cache_data
def load_data():
    # Reemplaza con el link o nombre del archivo CSV de Rappi
    # df = pd.read_csv("link_al_archivo.csv")
    
    # Mock data para que el código sea funcional de inmediato:
    data = {
        'store_id': [101, 102, 101, 103, 102, 101],
        'status': ['online', 'offline', 'online', 'online', 'online', 'offline'],
        'timestamp': pd.to_datetime(['2026-02-10 08:00', '2026-02-10 08:05', '2026-02-10 09:00', 
                                     '2026-02-10 09:10', '2026-02-10 10:00', '2026-02-10 11:00'])
    }
    return pd.DataFrame(data)

df = load_data()

# --- SECCIÓN 1: DASHBOARD DE VISUALIZACIÓN ---
st.header("📊 Dashboard de Disponibilidad")
col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("Métricas Clave")
    total_cambios = len(df)
    tiendas_unicas = df['store_id'].nunique()
    st.metric("Total de Registros", total_cambios)
    st.metric("Tiendas Monitoreadas", tiendas_unicas)

with col2:
    st.subheader("Historial de Estados")
    fig = px.timeline(df, x_start="timestamp", x_end="timestamp", y="store_id", color="status",
                     title="Línea de tiempo de estados por tienda")
    st.plotly_chart(fig, use_container_width=True)

# --- SECCIÓN 2: CHATBOT SEMÁNTICO (Agente de AI) ---
st.divider()
st.header("🤖 Asistente Virtual de Datos")

# Configuración del LLM - Asegúrate de tener tu API Key
# Puedes usar st.sidebar.text_input para la clave si no quieres hardcodearla
api_key = st.sidebar.text_input("OpenAI API Key", type="password")

if api_key:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, openai_api_key=api_key)
    
    # Creación del Agente (El corazón de la solución de AI)
    agent = create_pandas_dataframe_agent(
        llm, 
        df, 
        verbose=True, 
        allow_dangerous_code=True # Necesario para ejecutar Pandas
    )

    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Mostrar historial
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input
    if prompt := st.chat_input("Ej: ¿Cuál es el store_id con más cambios a offline?"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Pensando..."):
                # El agente analiza el dataframe y responde
                response = agent.run(prompt)
                st.markdown(response)
                st.session_state.messages.append({"role": "assistant", "content": response})
else:
    st.warning("Por favor, introduce tu OpenAI API Key en la barra lateral para activar el Chatbot.")
