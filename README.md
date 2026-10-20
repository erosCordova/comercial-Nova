# Comercial Nova

## Sistema de segmentación inteligente de clientes

Proyecto académico de la práctica aplicada de la Semana 10:
React + Machine Learning.

## Objetivo

Desarrollar una aplicación web para gestionar clientes,
identificar grupos de comportamiento mediante K-Means
y presentar recomendaciones comerciales orientativas.

## Tecnologías

- React, TypeScript y Vite.
- React Router para navegación.
- Recharts para visualizaciones.
- Lucide React para iconografía.
- Python y FastAPI para el backend.
- NumPy y scikit-learn para aprendizaje automático.
- pytest y Node.js para pruebas automatizadas.

## Módulos

### 1. Panel principal

Presenta los indicadores de total de clientes,
gasto promedio, visitas promedio y segmentos detectados.

Incluye gráficos basados en los datos disponibles
y el estado de la segmentación.

### 2. Clientes

Permite crear, consultar, actualizar, eliminar,
buscar y ordenar registros.

Valida campos obligatorios, códigos duplicados
y valores numéricos no negativos.

Incluye 12 registros iniciales de ejemplo.

### 3. Segmentación

Permite seleccionar K entre 2 y 5 y ejecutar
K-Means en la API Python.

Incluye estandarización, asignaciones,
estadísticas por grupo, gráficos,
filtro por segmento y ordenamiento.

El análisis se integra en este mismo módulo,
sin añadir una página independiente.

### 4. Recomendaciones

Interpreta los promedios de cada grupo y
propone acciones comerciales orientativas.

Muestra objetivos, estrategias, indicadores
de evaluación y clientes asociados.

## Arquitectura

Carpetas principales:

- `src/app`: navegación y estructura de la aplicación.
- `src/modules/dashboard`: indicadores principales.
- `src/modules/customers`: gestión de clientes.
- `src/modules/segmentation`: análisis K-Means.
- `src/modules/recommendations`: propuestas comerciales.
- `src/services`: servicios y lógica compartida.
- `src/types`: tipos TypeScript.
- `api/main.py`: API Python.
- `api/tests`: pruebas del backend.
- `tests`: pruebas automatizadas del frontend.
- `docs`: documentación académica.
- `evidencias`: resultados de validación.

## Iniciar frontend

En una terminal Git Bash, desde la raíz
de Comercial Nova:

1. Ejecutar `npm install` si aún no se instalaron dependencias.
2. Ejecutar `npm run dev`.
3. Abrir `http://localhost:5173/`.

## Iniciar backend

En otra terminal Git Bash, desde la raíz:

1. Si no existe, crear el entorno mediante `python -m venv api/.venv`.
2. Instalar dependencias con `api/.venv/Scripts/python.exe -m pip install -r api/requirements.txt`.
3. Iniciar el servidor con `api/.venv/Scripts/python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload`.
4. Consultar Swagger UI en `http://127.0.0.1:8000/docs`.

## Endpoints

- `GET /api/health`: comprueba el servicio.
- `POST /api/segmentation/run`: recibe K y los clientes
  y devuelve agrupamientos y estadísticas.

## Algoritmo de Machine Learning

Se utiliza K-Means real con scikit-learn.

Variables:

- Gasto acumulado.
- Visitas en seis meses.
- Antigüedad en meses.

Antes del agrupamiento se utiliza StandardScaler.
El modelo se configura con `random_state=42`,
`n_init=10` y `max_iter=300`.

Los nombres y códigos no forman parte
del cálculo de distancias.

## Persistencia

Los clientes y la última segmentación se
guardan mediante localStorage del navegador.

La información es local a cada navegador,
no una base de datos compartida.

Las modificaciones de clientes invalidan
la segmentación anterior.

## Pruebas

- Ejecutar `node --test tests/*.test.mjs`.
- Ejecutar `api/.venv/Scripts/python.exe -m pytest -q api/tests`.
- Ejecutar `npm run build`.

Los resultados de validación se almacenan
en la carpeta `evidencias`.

## Entregables

- Código fuente de React.
- Código fuente de Python.
- README.
- Informe técnico.
- Tabla de pruebas.
- Capturas de pantallas y resultados reales.

Documentos relacionados:

- `docs/INFORME_TECNICO.md`.
- `docs/PRUEBAS.md`.

## Limitaciones

La muestra original es ficticia y pequeña.

K-Means descubre semejanzas estadísticas,
pero no garantiza rentabilidad comercial.

Los grupos no tienen etiquetas de negocio
predefinidas: su interpretación se realiza
después del análisis.

La solución está orientada al trabajo
académico y a ejecución local.
