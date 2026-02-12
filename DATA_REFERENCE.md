# DATA_REFERENCE.md — Guía Completa del Dataset de Disponibilidad de Tiendas Rappi

> **Propósito**: Este documento es la referencia maestra para un agente de AI que debe generar gráficas y responder preguntas sobre los datos de disponibilidad de tiendas de Rappi. Contiene TODO lo necesario: schema, semántica, patrones, código ejemplo, edge cases y recetas de gráficas.

---

## 1. CÓMO CARGAR LOS DATOS

```python
import pandas as pd

df = pd.read_parquet("availability_clean.parquet")
df = df.sort_values("timestamp").reset_index(drop=True)
```

El archivo `availability_clean.parquet` es el dataset ya limpio y deduplicado, listo para análisis. Fue generado a partir de 201 archivos CSV exportados de Splunk/SignalFx.

---

## 2. SCHEMA DEL DATASET

| Columna | Tipo | Valores únicos | Descripción |
|---------|------|----------------|-------------|
| `Plot name` | `str` | 1 (`"NOW"`) | Nombre del plot en SignalFx. Siempre es `"NOW"`. No aporta información variable. Se puede ignorar en la mayoría de análisis. |
| `metric (sf_metric)` | `str` | 1 (`"synthetic_monitoring_visible_stores"`) | Nombre de la métrica de monitoreo. Siempre el mismo valor. Se puede ignorar. |
| `timestamp` | `datetime64[us, UTC+05:00]` | 67,141 | Fecha y hora de cada medición. Ver sección de Timezone. |
| `value` | `int64` | 65,880 | **Cantidad de tiendas visibles** en ese instante. Es LA variable principal del dataset. |
| `hour` | `int32` | 19 | Hora del día extraída del timestamp (0-23). Precalculada. |

### Notas críticas del schema:
- **Solo hay UNA serie temporal**: `value` vs `timestamp`. No hay dimensiones categóricas (país, ciudad, tipo de tienda, etc.).
- `Plot name` y `metric (sf_metric)` son constantes — NUNCA filtrar por ellas, no agregan información.
- `value` representa el número total de tiendas "online" (visibles para los usuarios) en la plataforma Rappi en un momento dado.

---

## 3. TIMEZONE — MUY IMPORTANTE

**El timezone almacenado en el parquet es `UTC+05:00`, pero la hora LOCAL representada es Colombia (UTC-5, América/Bogotá).**

Esto ocurre porque los CSVs originales tenían headers como:
```
Sun Feb 01 2026 06:11:20 GMT-0500 (hora estándar de Colombia)
```
Y pandas parseó el offset como `+05:00` en vez de `-05:00`. **La hora numérica (06:11, 14:30, etc.) ES la hora real de Colombia**. No se debe hacer ninguna conversión de timezone; simplemente tratar el timestamp como hora local de Colombia.

### Cómo manejar el timezone en código:

```python
# Si necesitas quitar el timezone (recomendado para simplificar):
df["timestamp"] = df["timestamp"].dt.tz_localize(None)

# NO HACER esto (produciría horas incorrectas):
# df["timestamp"] = df["timestamp"].dt.tz_convert("America/Bogota")
```

---

## 4. DIMENSIONES TEMPORALES DISPONIBLES

El dataset cubre **del 1 al 11 de febrero de 2026** (~10.4 días). Desde el timestamp se pueden derivar:

| Campo derivado | Código | Valores posibles | Uso |
|---|---|---|---|
| `date` | `df["timestamp"].dt.date` | 2026-02-01 a 2026-02-11 | Agrupar por día |
| `hour` | `df["timestamp"].dt.hour` (ya existe) | 0, 6, 7, 8, ..., 23 | Agrupar por hora |
| `minute` | `df["timestamp"].dt.minute` | 0-59 | Granularidad fina |
| `day_of_week` | `df["timestamp"].dt.day_name()` | Sunday, Monday, ..., Saturday | Patrones semanales |
| `day_num` | `df["timestamp"].dt.dayofweek` | 0=Monday, 6=Sunday | Para ordenar días |
| `is_weekend` | `df["timestamp"].dt.dayofweek >= 5` | True/False | Comparar semana vs fin de semana |
| `time_of_day` | `df["timestamp"].dt.time` | HH:MM:SS | Para gráficos de overlay diario |
| `week_number` | `df["timestamp"].dt.isocalendar().week` | 5, 6, 7 | Si se necesitan semanas |

### Fechas y días de la semana:

| Fecha | Día de la semana | Registros | Horas cubiertas |
|---|---|---|---|
| 2026-02-01 | Domingo | 6,412 | 6-23 |
| 2026-02-02 | Lunes | 6,399 | 0, 6-23 |
| 2026-02-03 | Martes | 6,413 | 0, 6-23 |
| 2026-02-04 | Miércoles | 6,451 | 0, 6-23 |
| 2026-02-05 | Jueves | 6,413 | 0, 6-23 |
| 2026-02-06 | Viernes | 6,429 | 0, 6-23 |
| 2026-02-07 | Sábado | 6,450 | 0, 6-23 |
| 2026-02-08 | Domingo | 6,093 | 0, 6-23 |
| 2026-02-09 | Lunes | 6,432 | 0, 6-23 |
| 2026-02-10 | Martes | 6,436 | 0, 6-23 |
| 2026-02-11 | Miércoles | 3,213 | 0, 6-15 (incompleto) |

### Gap nocturno:
- **No hay datos entre las 01:00 y las 05:59** (horas 1, 2, 3, 4, 5).
- La hora 0 (medianoche) tiene datos solo como "cola" del día anterior.
- El monitoreo activo va de ~06:00 a ~00:00 cada día.
- El primer día (Feb 01) empieza a las 06:11. El último día (Feb 11) solo tiene datos hasta las 15:00.

---

## 5. ESTADÍSTICAS DE `value` (TIENDAS VISIBLES)

### Estadísticas globales:

| Estadística | Valor |
|---|---|
| Count | 67,141 |
| Mean | 3,208,767 |
| Std | 1,915,247 |
| Min | 0 |
| P1 | 7,388 |
| P5 | 23,591 |
| P10 | 47,714 |
| P25 (Q1) | 1,622,819 |
| P50 (Mediana) | 3,542,039 |
| P75 (Q3) | 4,897,192 |
| P90 | 5,557,908 |
| P95 | 5,719,118 |
| P99 | 6,086,169 |
| Max | 6,198,472 |

### Interpretación:
- Los valores van de **0 a ~6.2 millones** de tiendas visibles.
- La distribución NO es normal; es **fuertemente bimodal** o multimodal, porque refleja el ciclo diario: valores bajos en la madrugada/mañana temprana y altos en la tarde.
- La alta desviación estándar (~1.9M) es consecuencia de este ciclo diario, no de ruido.

### Valores extremos:
- **6 registros con value=0**: ocurren al inicio del día (~06:11) cuando el monitoreo apenas arranca.
- **13 registros con value < 100**: mismos momentos de arranque.
- **14,831 registros > 5M**: son las horas pico normales (14h-17h).
- **1,416 registros > 6M**: el pico absoluto del dataset.

---

## 6. ESTADÍSTICAS POR HORA DEL DÍA

Cada fila representa el comportamiento promedio de TODAS las fechas para esa hora:

| Hora | Registros | Media | Std | Min | Max | Mediana | CV% |
|------|-----------|-------|-----|-----|-----|---------|-----|
| 0 | 357 | 655,208 | 417,218 | 0 | 1,504,845 | 649,782 | 63.6 |
| 6 | 3,210 | 13,241 | 5,649 | 0 | 23,971 | 14,456 | 42.7 |
| 7 | 3,921 | 37,815 | 7,290 | 13,765 | 51,986 | 36,775 | 19.3 |
| 8 | 3,908 | 371,483 | 104,910 | 39,745 | 554,670 | 346,485 | 28.2 |
| 9 | 3,960 | 1,234,260 | 293,236 | 396,432 | 1,769,292 | 1,223,143 | 23.8 |
| 10 | 3,960 | 2,154,596 | 322,547 | 1,229,277 | 2,767,407 | 2,181,833 | 15.0 |
| 11 | 3,960 | 2,883,113 | 360,281 | 1,941,205 | 3,496,699 | 2,936,763 | 12.5 |
| 12 | 3,960 | 3,726,390 | 422,132 | 2,472,258 | 4,382,917 | 3,849,823 | 11.3 |
| 13 | 3,960 | 4,510,963 | 441,151 | 3,168,410 | 5,100,639 | 4,683,031 | 9.8 |
| 14 | 3,960 | 5,158,840 | 452,432 | 3,816,338 | 5,895,811 | 5,278,251 | 8.8 |
| 15 | 3,601 | 5,199,630 | 909,797 | 1,633,913 | 6,192,228 | 5,517,693 | 17.5 |
| 16 | 3,600 | 5,146,310 | 1,001,908 | 1,600,223 | 6,198,472 | 5,573,400 | 19.5 |
| 17 | 3,600 | 5,247,763 | 634,020 | 3,955,820 | 6,124,001 | 5,485,213 | 12.1 |
| 18 | 3,600 | 4,983,317 | 666,327 | 2,277,694 | 5,866,732 | 5,199,530 | 13.4 |
| 19 | 3,236 | 4,915,166 | 547,405 | 3,610,433 | 5,685,503 | 5,042,708 | 11.1 |
| 20 | 3,600 | 4,482,142 | 553,352 | 3,299,959 | 5,539,421 | 4,606,205 | 12.3 |
| 21 | 3,600 | 3,757,024 | 459,525 | 2,729,131 | 4,864,163 | 3,779,903 | 12.2 |
| 22 | 3,600 | 2,849,578 | 441,315 | 1,880,015 | 3,929,961 | 2,837,742 | 15.5 |
| 23 | 3,548 | 1,626,171 | 406,236 | 843,143 | 2,844,215 | 1,630,414 | 25.0 |

### Interpretación del ciclo diario:
1. **06:00-06:30**: Arranque del monitoreo. Tiendas suben de ~0 a ~20K rápidamente.
2. **07:00-09:00**: Rampa de subida fuerte. De ~37K a ~1.2M.
3. **09:00-14:00**: Subida sostenida. De ~1.2M a ~5.2M.
4. **14:00-17:00**: **PICO** del día. Estabilidad entre 5.1M y 5.3M.
5. **17:00-23:00**: Bajada progresiva. De ~5.2M a ~1.6M.
6. **00:00**: Cola nocturna, ~655K tiendas.
7. **01:00-05:00**: Sin datos (gap nocturno).

---

## 7. ESTADÍSTICAS POR FECHA

| Fecha | Día | Registros | Media | Min | Max | Mediana |
|---|---|---|---|---|---|---|
| 2026-02-01 | Dom | 6,412 | 3,022,546 | 37 | 5,280,107 | 3,370,194 |
| 2026-02-02 | Lun | 6,399 | 2,620,567 | 28 | 4,554,582 | 3,051,516 |
| 2026-02-03 | Mar | 6,413 | 3,379,388 | 0 | 5,708,166 | 3,942,590 |
| 2026-02-04 | Mié | 6,451 | 3,524,982 | 0 | 5,917,626 | 4,083,087 |
| 2026-02-05 | Jue | 6,413 | 3,663,628 | 0 | 6,107,574 | 4,079,481 |
| 2026-02-06 | Vie | 6,429 | 3,722,633 | 0 | 6,198,472 | 4,181,438 |
| 2026-02-07 | Sáb | 6,450 | 3,480,623 | 155 | 5,738,300 | 4,059,191 |
| 2026-02-08 | Dom | 6,093 | 2,741,441 | 101 | 4,969,210 | 3,167,102 |
| 2026-02-09 | Lun | 6,432 | 3,067,439 | 22 | 5,122,526 | 3,547,482 |
| 2026-02-10 | Mar | 6,436 | 3,209,286 | 0 | 5,767,000 | 3,260,585 |
| 2026-02-11 | Mié | 3,213 | 2,462,669 | 82 | 5,710,374 | 2,410,654 |

### Observaciones por fecha:
- **Feb 06 (viernes)** tiene el máximo absoluto del dataset: 6,198,472.
- **Feb 02 (lunes)** y **Feb 08 (domingo)** tienen los promedios más bajos → fines de semana/inicio de semana tienen menos tiendas.
- **Feb 11** está incompleto (solo hasta 15:00), lo que baja su media artificialmente.

### Pico diario (hora con mayor promedio):

| Fecha | Hora pico | Valor promedio pico |
|---|---|---|
| 2026-02-01 | 15h | 5,159,277 |
| 2026-02-02 | 15h | 4,409,257 |
| 2026-02-03 | 16h | 5,636,293 |
| 2026-02-04 | 16h | 5,849,748 |
| 2026-02-05 | 16h | 6,039,551 |
| 2026-02-06 | 16h | 6,130,941 |
| 2026-02-07 | 15h | 5,634,979 |
| 2026-02-08 | 15h | 4,806,845 |
| 2026-02-09 | 16h | 5,070,860 |
| 2026-02-10 | 17h | 5,566,658 |
| 2026-02-11 | 15h | 5,630,566 |

---

## 8. PATRONES DETECTADOS

### 8.1. Ciclo diario (patrón dominante)
Cada día repite un ciclo predecible:
- **Rampa matutina** (06:00→14:00): las tiendas "se encienden" progresivamente.
- **Meseta/pico** (14:00→17:00): máxima disponibilidad.
- **Declinación nocturna** (17:00→00:00): tiendas se "apagan" gradualmente.
- **Gap nocturno** (01:00→05:59): sin monitoreo.

### 8.2. Diferencia semana vs fin de semana
- **Entre semana** (Lun-Vie): pico típico entre 5.0M y 6.2M tiendas.
- **Fin de semana** (Sáb-Dom): pico típico entre 4.5M y 5.3M tiendas (~15% menos).
- El lunes (Feb 02) también fue bajo, posiblemente efecto "arranque de semana".

### 8.3. Tendencia semanal
Los picos diarios crecen de lunes a viernes:
- Lun 02: 4.5M → Vie 06: 6.2M (crecimiento ~37% lun→vie)
- Esto se repite la segunda semana parcial.

### 8.4. Valores en cero
6 registros con value=0 ocurren a las 06:11-06:12 de cada día (los primeros instantes). No son anomalías sino el inicio del monitoreo.

---

## 9. CAMPOS DERIVADOS — RECETAS PARA EL AGENTE

El agente DEBE saber cómo crear estos campos para responder preguntas:

```python
# Quitar timezone (simplifica todo)
df["timestamp"] = df["timestamp"].dt.tz_localize(None)

# Campos temporales básicos
df["date"] = df["timestamp"].dt.date
df["hour"] = df["timestamp"].dt.hour           # ya existe
df["minute"] = df["timestamp"].dt.minute
df["day_of_week"] = df["timestamp"].dt.day_name()
df["day_num"] = df["timestamp"].dt.dayofweek    # 0=Lunes
df["is_weekend"] = df["timestamp"].dt.dayofweek >= 5
df["time_of_day"] = df["timestamp"].dt.time
df["hour_minute"] = df["timestamp"].dt.strftime("%H:%M")

# Métricas derivadas de la serie temporal
df["value_diff"] = df["value"].diff()                    # cambio absoluto entre registros
df["value_pct_change"] = df["value"].pct_change() * 100  # cambio porcentual entre registros

# Medias móviles (ventanas basadas en número de registros a 10s cada uno)
df["rolling_mean_1min"] = df["value"].rolling(6).mean()     # 6 x 10s = 1 min
df["rolling_mean_5min"] = df["value"].rolling(30).mean()    # 30 x 10s = 5 min
df["rolling_mean_15min"] = df["value"].rolling(90).mean()   # 90 x 10s = 15 min
df["rolling_mean_1h"] = df["value"].rolling(360).mean()     # 360 x 10s = 1 hora

# Z-score para detección de anomalías
df["value_zscore"] = (df["value"] - df["value"].mean()) / df["value"].std()

# Formateo para display
df["value_millions"] = df["value"] / 1_000_000  # para mostrar en "M" en ejes
df["value_formatted"] = df["value"].apply(lambda x: f"{x/1_000_000:.2f}M" if x >= 1_000_000 else f"{x/1_000:.1f}K")
```

---

## 10. RESAMPLINGS — CÓMO CAMBIAR LA GRANULARIDAD

El dato original es cada **10 segundos** (67,141 registros). Para gráficas legibles, se debe resamplear:

```python
# IMPORTANTE: Primero poner timestamp como índice
df_ts = df.set_index("timestamp")

# Resamplear a diferentes granularidades
df_1min = df_ts["value"].resample("1min").mean()     # ~11,189 puntos
df_5min = df_ts["value"].resample("5min").mean()     # ~2,238 puntos
df_15min = df_ts["value"].resample("15min").mean()   # ~746 puntos
df_1h = df_ts["value"].resample("1h").mean()         # ~187 puntos
df_1d = df_ts["value"].resample("1D").mean()         # 11 puntos

# Para gráficas de serie temporal completa, usar 5min o 15min
# Para gráficas de un solo día, usar 1min
# Para gráficas de resumen, usar 1h o 1D
```

### Guía de qué granularidad usar:

| Pregunta del usuario | Granularidad recomendada | Puntos aprox |
|---|---|---|
| "Muestra toda la serie temporal" | 15min | ~746 |
| "Gráfica de un día específico" | 1min | ~1,080 |
| "Gráfica de una hora específica" | 10s (original) | ~360 |
| "Comparar días" | 1h | ~19 por día |
| "Tendencia general" | 1D (diario) | 11 |
| "Heatmap día×hora" | 1h | 11×19 |

---

## 11. FILTRADO — CÓMO RESPONDER PREGUNTAS ESPECÍFICAS

```python
# Filtrar por rango de fechas
mask_dates = (df["timestamp"] >= "2026-02-03") & (df["timestamp"] < "2026-02-06")
df_filtered = df[mask_dates]

# Filtrar por hora del día
mask_peak = df["hour"].between(14, 17)  # horas pico
df_peak = df[mask_peak]

# Filtrar por día de la semana
mask_weekend = df["timestamp"].dt.dayofweek >= 5
df_weekend = df[mask_weekend]

# Filtrar por un día específico
mask_day = df["timestamp"].dt.date == pd.Timestamp("2026-02-06").date()
df_one_day = df[mask_day]

# Filtrar por rango de valores
mask_low = df["value"] < 100_000  # tiendas bajas
df_low = df[mask_low]

# Combinar filtros
mask_combo = (df["hour"].between(14, 17)) & (df["timestamp"].dt.date == pd.Timestamp("2026-02-06").date())
df_combo = df[mask_combo]
```

---

## 12. RECETAS DE GRÁFICAS — PLOTLY

El agente debe generar gráficas con Plotly. Aquí están las recetas para cada tipo de pregunta:

### 12.1. Serie temporal completa

```python
import plotly.express as px

df_plot = df.set_index("timestamp")["value"].resample("15min").mean().reset_index()
df_plot.columns = ["timestamp", "value"]
df_plot["value_M"] = df_plot["value"] / 1_000_000

fig = px.line(df_plot, x="timestamp", y="value_M",
              title="Tiendas Visibles - Serie Temporal Completa",
              labels={"value_M": "Tiendas Visibles (Millones)", "timestamp": "Fecha/Hora"})
fig.update_layout(hovermode="x unified")
fig.show()
```

### 12.2. Un día específico

```python
import plotly.express as px

target_date = "2026-02-06"
df_day = df[df["timestamp"].dt.date == pd.Timestamp(target_date).date()].copy()
df_day = df_day.set_index("timestamp")["value"].resample("1min").mean().reset_index()
df_day.columns = ["timestamp", "value"]
df_day["value_M"] = df_day["value"] / 1_000_000

fig = px.line(df_day, x="timestamp", y="value_M",
              title=f"Tiendas Visibles - {target_date}",
              labels={"value_M": "Tiendas Visibles (M)", "timestamp": "Hora"})
fig.show()
```

### 12.3. Promedio por hora del día (bar chart)

```python
import plotly.express as px

hourly_avg = df.groupby("hour")["value"].mean().reset_index()
hourly_avg["value_M"] = hourly_avg["value"] / 1_000_000

fig = px.bar(hourly_avg, x="hour", y="value_M",
             title="Promedio de Tiendas Visibles por Hora del Día",
             labels={"value_M": "Promedio (M)", "hour": "Hora"},
             color="value_M", color_continuous_scale="RdYlGn")
fig.update_xaxes(dtick=1)
fig.show()
```

### 12.4. Heatmap día × hora

```python
import plotly.express as px

df["date_str"] = df["timestamp"].dt.strftime("%Y-%m-%d (%a)")
pivot = df.groupby(["date_str", "hour"])["value"].mean().reset_index()
pivot["value_M"] = pivot["value"] / 1_000_000

fig = px.density_heatmap(pivot, x="hour", y="date_str", z="value_M",
                          title="Heatmap: Tiendas Visibles por Día y Hora",
                          labels={"value_M": "Tiendas (M)", "hour": "Hora", "date_str": "Fecha"},
                          color_continuous_scale="YlOrRd")
fig.update_xaxes(dtick=1)
fig.show()
```

**Alternativa con `px.imshow` para heatmap real:**

```python
import plotly.express as px
import numpy as np

pivot_table = df.pivot_table(values="value", index=df["timestamp"].dt.date, columns="hour", aggfunc="mean")
pivot_table = pivot_table / 1_000_000  # en millones

fig = px.imshow(pivot_table, 
                title="Heatmap: Tiendas Visibles por Día y Hora",
                labels={"x": "Hora del Día", "y": "Fecha", "color": "Tiendas (M)"},
                color_continuous_scale="YlOrRd",
                aspect="auto")
fig.show()
```

### 12.5. Comparar múltiples días (overlay)

```python
import plotly.graph_objects as go

fig = go.Figure()
for date in sorted(df["timestamp"].dt.date.unique()):
    day_data = df[df["timestamp"].dt.date == date].copy()
    day_data = day_data.set_index("timestamp")["value"].resample("5min").mean().reset_index()
    day_data["minutes_since_midnight"] = (day_data["timestamp"] - pd.Timestamp(date)).dt.total_seconds() / 3600
    day_data["value_M"] = day_data["value"] / 1_000_000
    fig.add_trace(go.Scatter(x=day_data["minutes_since_midnight"], y=day_data["value_M"],
                              mode="lines", name=str(date), opacity=0.7))

fig.update_layout(title="Comparación de Curvas Diarias",
                  xaxis_title="Hora del Día", yaxis_title="Tiendas Visibles (M)",
                  hovermode="x unified")
fig.update_xaxes(dtick=1)
fig.show()
```

### 12.6. Distribución (histograma)

```python
import plotly.express as px

df_hist = df.copy()
df_hist["value_M"] = df_hist["value"] / 1_000_000

fig = px.histogram(df_hist, x="value_M", nbins=50,
                   title="Distribución de Tiendas Visibles",
                   labels={"value_M": "Tiendas Visibles (M)"})
fig.add_vline(x=df_hist["value_M"].mean(), line_dash="dash", line_color="red",
              annotation_text=f"Media: {df_hist['value_M'].mean():.2f}M")
fig.show()
```

### 12.7. Boxplot por hora

```python
import plotly.express as px

df_box = df.copy()
df_box["value_M"] = df_box["value"] / 1_000_000

fig = px.box(df_box, x="hour", y="value_M",
             title="Distribución de Tiendas Visibles por Hora",
             labels={"value_M": "Tiendas (M)", "hour": "Hora"})
fig.update_xaxes(dtick=1)
fig.show()
```

### 12.8. Boxplot por día de la semana

```python
import plotly.express as px

df_box = df.copy()
df_box["value_M"] = df_box["value"] / 1_000_000
df_box["day_of_week"] = df_box["timestamp"].dt.day_name()
day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

fig = px.box(df_box, x="day_of_week", y="value_M",
             title="Distribución por Día de la Semana",
             labels={"value_M": "Tiendas (M)", "day_of_week": "Día"},
             category_orders={"day_of_week": day_order})
fig.show()
```

### 12.9. Semana vs fin de semana

```python
import plotly.express as px

df_comp = df.copy()
df_comp["value_M"] = df_comp["value"] / 1_000_000
df_comp["tipo"] = df_comp["timestamp"].dt.dayofweek.apply(lambda x: "Fin de Semana" if x >= 5 else "Entre Semana")
hourly_comp = df_comp.groupby(["tipo", "hour"])["value_M"].mean().reset_index()

fig = px.line(hourly_comp, x="hour", y="value_M", color="tipo",
              title="Perfil Horario: Semana vs Fin de Semana",
              labels={"value_M": "Tiendas Promedio (M)", "hour": "Hora"})
fig.update_xaxes(dtick=1)
fig.show()
```

### 12.10. Tasa de cambio / Velocidad de subida-bajada

```python
import plotly.express as px

df_rate = df.set_index("timestamp")["value"].resample("5min").mean().reset_index()
df_rate.columns = ["timestamp", "value"]
df_rate["change_per_5min"] = df_rate["value"].diff()
df_rate["change_pct"] = df_rate["value"].pct_change() * 100

fig = px.line(df_rate, x="timestamp", y="change_per_5min",
              title="Tasa de Cambio de Tiendas Visibles (cada 5 min)",
              labels={"change_per_5min": "Cambio (absoluto)", "timestamp": "Fecha/Hora"})
fig.add_hline(y=0, line_dash="dash", line_color="gray")
fig.show()
```

### 12.11. Detección de anomalías visual

```python
import plotly.graph_objects as go

df_anom = df.set_index("timestamp")["value"].resample("5min").mean().reset_index()
df_anom.columns = ["timestamp", "value"]
df_anom["rolling_mean"] = df_anom["value"].rolling(12).mean()  # 1h
df_anom["rolling_std"] = df_anom["value"].rolling(12).std()
df_anom["upper"] = df_anom["rolling_mean"] + 2 * df_anom["rolling_std"]
df_anom["lower"] = df_anom["rolling_mean"] - 2 * df_anom["rolling_std"]
df_anom["is_anomaly"] = (df_anom["value"] > df_anom["upper"]) | (df_anom["value"] < df_anom["lower"])
df_anom["value_M"] = df_anom["value"] / 1_000_000
df_anom["upper_M"] = df_anom["upper"] / 1_000_000
df_anom["lower_M"] = df_anom["lower"] / 1_000_000

fig = go.Figure()
fig.add_trace(go.Scatter(x=df_anom["timestamp"], y=df_anom["value_M"],
                          mode="lines", name="Tiendas Visibles"))
fig.add_trace(go.Scatter(x=df_anom["timestamp"], y=df_anom["upper_M"],
                          mode="lines", name="Límite Superior", line=dict(dash="dash", color="gray")))
fig.add_trace(go.Scatter(x=df_anom["timestamp"], y=df_anom["lower_M"],
                          mode="lines", name="Límite Inferior", line=dict(dash="dash", color="gray"),
                          fill="tonexty", fillcolor="rgba(200,200,200,0.2)"))
anomalies = df_anom[df_anom["is_anomaly"]]
fig.add_trace(go.Scatter(x=anomalies["timestamp"], y=anomalies["value_M"],
                          mode="markers", name="Anomalías", marker=dict(color="red", size=6)))
fig.update_layout(title="Detección de Anomalías (±2σ sobre media móvil 1h)",
                  yaxis_title="Tiendas (M)", hovermode="x unified")
fig.show()
```

### 12.12. KPI Cards (métricas clave)

```python
# Para mostrar en tarjetas o indicadores
last_value = df.sort_values("timestamp")["value"].iloc[-1]
avg_value = df["value"].mean()
max_value = df["value"].max()
min_value = df["value"].min()

# Porcentaje de tiempo por encima de un umbral (ej: 5M)
threshold = 5_000_000
uptime_pct = (df["value"] >= threshold).mean() * 100

# Valor actual vs promedio
vs_avg_pct = (last_value - avg_value) / avg_value * 100

print(f"Último valor: {last_value:,.0f}")
print(f"Promedio: {avg_value:,.0f}")
print(f"Máximo: {max_value:,.0f}")
print(f"% tiempo > 5M: {uptime_pct:.1f}%")
print(f"Actual vs promedio: {vs_avg_pct:+.1f}%")
```

### 12.13. Tabla resumen diario

```python
import plotly.graph_objects as go

daily = df.groupby(df["timestamp"].dt.date)["value"].agg(["mean", "min", "max", "std", "count"])
daily = daily.reset_index()
daily.columns = ["Fecha", "Promedio", "Mínimo", "Máximo", "Std", "Registros"]
daily["Promedio"] = daily["Promedio"].apply(lambda x: f"{x/1e6:.2f}M")
daily["Mínimo"] = daily["Mínimo"].apply(lambda x: f"{x:,.0f}")
daily["Máximo"] = daily["Máximo"].apply(lambda x: f"{x/1e6:.2f}M")

fig = go.Figure(data=[go.Table(
    header=dict(values=list(daily.columns)),
    cells=dict(values=[daily[col] for col in daily.columns])
)])
fig.update_layout(title="Resumen Diario")
fig.show()
```

---

## 13. PREGUNTAS FRECUENTES QUE EL USUARIO PODRÍA HACER

Y cómo traducirlas a operaciones con los datos:

| Pregunta del usuario | Operación | Gráfica |
|---|---|---|
| "¿Cuántas tiendas hay ahora?" | `df["value"].iloc[-1]` | KPI card |
| "¿Cómo se ve la tendencia general?" | Resamplear a 1h, line chart | 12.1 |
| "¿Cuál fue el pico máximo?" | `df.loc[df["value"].idxmax()]` | Marcar en serie temporal |
| "¿Qué día hubo más tiendas?" | `df.groupby(date)["value"].max()` | Bar chart por día |
| "¿A qué hora hay más tiendas?" | `df.groupby("hour")["value"].mean()` | 12.3 |
| "Muéstrame el día [fecha]" | Filtrar + line chart | 12.2 |
| "Compara semana vs fin de semana" | Separar por is_weekend | 12.9 |
| "¿Hay anomalías?" | Rolling mean ± 2σ | 12.11 |
| "¿Cuánto sube de mañana a tarde?" | Tasa de cambio | 12.10 |
| "Muestra la distribución" | Histograma | 12.6 |
| "Compara todos los días" | Overlay de curvas diarias | 12.5 |
| "Heatmap" | Pivot date×hour | 12.4 |
| "¿Cuándo bajan más las tiendas?" | Filtrar diff negativa + top | Bar chart |
| "Boxplot por hora" | Agrupar por hora | 12.7 |
| "Dame un resumen" | Tabla con stats por día | 12.13 |
| "¿Cuánto tiempo estuvo por encima de X?" | `(df["value"] >= X).mean()` | KPI o area chart |
| "¿Qué pasó el [fecha] a las [hora]?" | Filtrar fecha + hora | Line chart enfocado |
| "Media móvil" | Rolling con ventana | Line chart con overlay |
| "Muestra los últimos N horas/días" | `df[df["timestamp"] >= cutoff]` | Line chart |

---

## 14. EDGE CASES Y ADVERTENCIAS PARA EL AGENTE

1. **Feb 11 está incompleto**: Solo tiene datos hasta las 15:00. No comparar directamente su "promedio diario" con otros días sin advertir esto.

2. **Feb 01 empieza a las 06:11**: No tiene hora 0 ni las primeras horas del día. Es el inicio del dataset.

3. **Gap nocturno (01:00-05:59)**: No hay datos en esas horas. Si el usuario pregunta por las 3am, responder que no hay datos disponibles.

4. **Valores = 0**: Son 6 registros legítimos al inicio del monitoreo diario (~06:11). No son errores.

5. **Escala de valores**: Van de 0 a 6.2M. Siempre mostrar en millones (dividir por 1,000,000) para legibilidad. Usar el sufijo "M" en los ejes.

6. **Granularidad original**: 10 segundos. Para gráficas generales, SIEMPRE resamplear (5min o 15min). El dato original de 10s solo para zoom específico.

7. **Timezone**: Tratar como hora local de Colombia. No convertir. Si se quita el tz con `tz_localize(None)`, las horas siguen siendo correctas.

8. **Una sola métrica**: No hay filtros por país, ciudad, tienda, etc. Si el usuario pide algo por "región", explicar que los datos son agregados a nivel de toda la plataforma.

9. **Resampleo y NaN**: Al resamplear, pueden aparecer NaN en las horas sin datos (01-05h). Usar `.dropna()` o `.fillna(0)` según contexto.

10. **Outliers de rampa**: Los valores de 6-7am son extremadamente bajos comparados con el resto del día. Si se incluyen en estadísticas, sesgan la media a la baja. Considerar filtrarlos para ciertos análisis.

---

## 15. CONTEXTO DE NEGOCIO

- **¿Qué mide esto?**: La cantidad de tiendas en Rappi que están "visibles" (online, disponibles para recibir pedidos) en cada momento del día.
- **¿Por qué importa?**: Más tiendas visibles = más opciones para el usuario = más potencial de ventas. Una caída en tiendas visibles puede indicar un problema de plataforma, un bug, o un incidente.
- **¿Qué es "synthetic monitoring"?**: Es una prueba automatizada que simula un usuario navegando la app para contar cuántas tiendas puede ver. Se ejecuta cada 10 segundos.
- **Ciclo de negocio**: Las tiendas abren progresivamente desde las 6am, alcanzan el pico operativo entre 2pm y 5pm, y cierran gradualmente hasta la medianoche.

---

## 16. LIBRERÍAS REQUERIDAS

```python
import pandas as pd          # Manipulación de datos
import plotly.express as px   # Gráficas rápidas
import plotly.graph_objects as go  # Gráficas avanzadas
import numpy as np            # Cálculos numéricos
```

Todas las recetas de este documento usan exclusivamente Plotly para gráficas interactivas. El agente debe usar `plotly.express` para gráficas simples y `plotly.graph_objects` cuando necesita más control (múltiples traces, bandas, anotaciones).

---

## 17. TEMPLATE DE RESPUESTA DEL AGENTE

Cuando el usuario haga una pregunta, el agente debe:

1. **Entender la pregunta** → mapearla a la tabla de la sección 13.
2. **Filtrar los datos** si es necesario (sección 11).
3. **Elegir la granularidad correcta** (sección 10).
4. **Crear campos derivados** si se necesitan (sección 9).
5. **Generar la gráfica** usando la receta correspondiente (sección 12).
6. **Mostrar la gráfica** con `fig.show()` o retornar el objeto `fig`.

```python
# Template genérico
import pandas as pd
import plotly.express as px

# 1. Cargar datos
df = pd.read_parquet("availability_clean.parquet")
df["timestamp"] = df["timestamp"].dt.tz_localize(None)
df = df.sort_values("timestamp").reset_index(drop=True)

# 2. Filtrar (según pregunta)
# df_filtered = df[...]

# 3. Resamplear (si necesario)
# df_plot = df_filtered.set_index("timestamp")["value"].resample("5min").mean().reset_index()

# 4. Calcular campos derivados
# df_plot["value_M"] = df_plot["value"] / 1_000_000

# 5. Generar gráfica
# fig = px.line(df_plot, x="timestamp", y="value_M", title="...")
# fig.show()
```
