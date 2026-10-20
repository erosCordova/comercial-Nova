import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  BarChart3,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Database,
  LoaderCircle,
  Play,
  SlidersHorizontal,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type {
  Customer,
  SegmentationSummary,
} from "../../types";

import {
  getCustomers,
  moneyFormatter,
} from "../../services/customerService";

import {
  getStoredSegmentation,
  runSegmentation,
} from "../../services/segmentationService";

import type {
  KMeansMetadata,
} from "../../services/segmentationService";

import "./segmentation.css";

const COLORS = [
  "#0aaac5",
  "#7f75dc",
  "#f0a04e",
  "#2fb28a",
  "#df77a3",
];

type SortOrder =
  | "gasto-desc"
  | "gasto-asc"
  | "visitas-desc"
  | "visitas-asc";

interface PageData {
  customers: Customer[];
  summary: SegmentationSummary | null;
  error: string;
}

function readData(): PageData {
  try {
    const customers = getCustomers();

    return {
      customers,
      summary: getStoredSegmentation(customers),
      error: "",
    };
  } catch (error) {
    return {
      customers: [],
      summary: null,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los clientes.",
    };
  }
}

export default function SegmentationPage() {
  const [data, setData] = useState<PageData>(readData);

  const [k, setK] = useState(3);

  const [loading, setLoading] = useState(false);
  const [runError, setRunError] = useState("");
  const [runMessage, setRunMessage] = useState("");

  const [metadata, setMetadata] =
    useState<KMeansMetadata | null>(null);

  const [selectedSegment, setSelectedSegment] =
    useState("todos");

  const [sortOrder, setSortOrder] =
    useState<SortOrder>("gasto-desc");

  useEffect(() => {
    function refresh() {
      setData(readData());
    }

    window.addEventListener(
      "comercial-nova:customers-updated",
      refresh,
    );

    window.addEventListener(
      "comercial-nova:segmentation-updated",
      refresh,
    );

    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(
        "comercial-nova:customers-updated",
        refresh,
      );

      window.removeEventListener(
        "comercial-nova:segmentation-updated",
        refresh,
      );

      window.removeEventListener("storage", refresh);
    };
  }, []);

  const { customers, summary, error } = data;

  const canRun =
    !loading &&
    !error &&
    customers.length >= k;

  const groups = useMemo(
    () =>
      summary
        ? [...summary.grupos].sort(
            (a, b) => a.id - b.id,
          )
        : [],
    [summary],
  );

  const filteredCustomers = useMemo(() => {
    if (!summary) return [];

    const selected = customers.filter((customer) => {
      if (selectedSegment === "todos") {
        return true;
      }

      return (
        customer.segmento === Number(selectedSegment)
      );
    });

    return selected.sort((a, b) => {
      switch (sortOrder) {
        case "gasto-asc":
          return a.gastoAcumulado - b.gastoAcumulado;
        case "visitas-desc":
          return b.visitas6Meses - a.visitas6Meses;
        case "visitas-asc":
          return a.visitas6Meses - b.visitas6Meses;
        default:
          return b.gastoAcumulado - a.gastoAcumulado;
      }
    });
  }, [
    customers,
    summary,
    selectedSegment,
    sortOrder,
  ]);

  const scatterGroups = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        points: customers
          .filter(
            (customer) =>
              customer.segmento === group.id,
          )
          .map((customer) => ({
            id: customer.id,
            nombre: customer.nombre,
            gasto: customer.gastoAcumulado,
            visitas: customer.visitas6Meses,
            size: 70,
          })),
      })),
    [customers, groups],
  );

  async function handleRun() {
    setRunError("");
    setRunMessage("");
    setMetadata(null);

    if (customers.length < k) {
      setRunError(
        `Se necesitan al menos ${k} clientes válidos.`,
      );
      return;
    }

    setLoading(true);

    try {
      const result = await runSegmentation(
        customers,
        k,
      );

      setData({
        customers: result.customers,
        summary: result.summary,
        error: "",
      });

      setMetadata(result.metadata);
      setSelectedSegment("todos");

      setRunMessage(
        `K-Means procesó correctamente ${result.summary.cantidadProcesada} clientes y encontró ${result.summary.grupos.length} segmentos.`,
      );
    } catch (caught) {
      setRunError(
        caught instanceof Error
          ? caught.message
          : "No se pudo realizar la segmentación.",
      );

      setData(readData());
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="seg-failure">
        <AlertCircle size={34} />

        <h2>No se pudieron cargar los clientes</h2>

        <p>{error}</p>

        <p>
          Los datos existentes permanecerán conservados.
        </p>
      </div>
    );
  }

  return (
    <div className="seg-page">
      <header className="seg-intro">
        <div>
          <span className="seg-eyebrow">
            APRENDIZAJE NO SUPERVISADO
          </span>

          <h2>Segmentación inteligente de clientes</h2>

          <p>
            Descubre patrones de comportamiento con
            K-Means, analiza los grupos obtenidos
            y compara sus características comerciales.
          </p>
        </div>

        <div className="seg-intro-icon">
          <BrainCircuit size={34} />
        </div>
      </header>

      <section className="seg-config">
        <div className="seg-section-heading">
          <div>
            <span className="seg-eyebrow">
              CONFIGURACIÓN DEL MODELO
            </span>

            <h3>Ejecutar algoritmo K-Means</h3>

            <p>
              Selecciona cuántos grupos deseas encontrar.
            </p>
          </div>

          <span className="seg-engine-badge">
            Python · scikit-learn
          </span>
        </div>

        <div className="seg-controls">
          <label className="seg-k-control">
            <span>Número de segmentos (K)</span>

            <select
              value={k}
              disabled={loading}
              onChange={(event) => {
                setK(Number(event.target.value));
                setRunError("");
                setRunMessage("");
              }}
            >
              {[2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} segmentos
                </option>
              ))}
            </select>
          </label>

          <div className="seg-available">
            <UsersRound size={19} />
            <div>
              <strong>{customers.length}</strong>
              <span>clientes disponibles</span>
            </div>
          </div>

          <button
            className="seg-run-button"
            type="button"
            onClick={handleRun}
            disabled={!canRun}
          >
            {loading ? (
              <LoaderCircle
                size={18}
                className="seg-spin"
              />
            ) : (
              <Play size={18} />
            )}

            {loading
              ? "Procesando..."
              : "Ejecutar segmentación"}
          </button>
        </div>

        {customers.length < k && (
          <div className="seg-notice seg-warning" role="alert">
            <AlertCircle size={18} />

            <span>
              K={k} requiere al menos {k} clientes válidos.
              Actualmente tienes {customers.length}.
            </span>
          </div>
        )}

        {runError && (
          <div className="seg-notice seg-error" role="alert">
            <AlertCircle size={18} />
            <span>{runError}</span>
          </div>
        )}

        {runMessage && (
          <div className="seg-notice seg-success" role="status">
            <CheckCircle2 size={18} />
            <span>{runMessage}</span>
          </div>
        )}

        <div className="seg-process-info">
          <SlidersHorizontal size={18} />

          <span>
            Variables: gasto acumulado, visitas en
            seis meses y antigüedad. Se utiliza
            StandardScaler, random_state=42 y
            n_init=10 para obtener resultados
            reproducibles.
          </span>
        </div>
      </section>

      {summary ? (
        <>
          <section className="seg-result-metrics">
            <div className="seg-result-stat">
              <UsersRound size={21} />
              <span>Clientes procesados</span>
              <strong>
                {summary.cantidadProcesada}
              </strong>
            </div>

            <div className="seg-result-stat">
              <BrainCircuit size={21} />
              <span>Grupos encontrados</span>
              <strong>{summary.grupos.length}</strong>
            </div>

            <div className="seg-result-stat">
              <Activity size={21} />
              <span>Iteraciones</span>
              <strong>
                {metadata?.iteraciones ?? summary.iteraciones ?? "—"}
              </strong>
            </div>

            <div className="seg-result-stat">
              <BarChart3 size={21} />
              <span>Tiempo de ejecución</span>
              <strong>
                {typeof summary.tiempoEjecucionMs === "number"
                  ? `${summary.tiempoEjecucionMs.toFixed(2)} ms`
                  : "—"}
              </strong>
            </div>
          </section>

          <section className="seg-analysis-section">
            <div className="seg-section-heading">
              <div>
                <span className="seg-eyebrow">
                  INTERPRETACIÓN COMERCIAL
                </span>

                <h3>Perfiles de los segmentos</h3>

                <p>
                  Promedios calculados a partir de
                  los clientes asignados a cada grupo.
                </p>
              </div>
            </div>

            <div className="seg-group-grid">
              {groups.map((group) => (
                <article
                  key={group.id}
                  className="seg-group-card"
                  style={{
                    borderTopColor:
                      COLORS[group.id % COLORS.length],
                  }}
                >
                  <div className="seg-group-heading">
                    <span
                      className="seg-group-dot"
                      style={{
                        background:
                          COLORS[
                            group.id % COLORS.length
                          ],
                      }}
                    />

                    <strong>
                      Segmento {group.id}
                    </strong>

                    <span className="seg-group-count">
                      {group.cantidad} clientes
                    </span>
                  </div>

                  <div className="seg-group-stats">
                    <div>
                      <Wallet size={17} />
                      <span>Gasto promedio</span>
                      <strong>
                        {moneyFormatter.format(
                          group.gastoPromedio,
                        )}
                      </strong>
                    </div>

                    <div>
                      <Activity size={17} />
                      <span>Visitas promedio</span>
                      <strong>
                        {group.visitasPromedio.toFixed(2)}
                      </strong>
                    </div>

                    <div>
                      <CalendarClock size={17} />
                      <span>Antigüedad promedio</span>
                      <strong>
                        {group.antiguedadPromedio.toFixed(2)}{" "}
                        meses
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="seg-chart-panel">
            <div className="seg-section-heading">
              <div>
                <span className="seg-eyebrow">
                  VISUALIZACIÓN DE AGRUPAMIENTO
                </span>

                <h3>Distribución de los clientes</h3>

                <p>
                  Gráfico de gasto frente a visitas.
                  Los colores representan los grupos
                  calculados con las tres variables.
                </p>
              </div>
            </div>

            <div className="seg-scatter">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <ScatterChart
                  margin={{
                    top: 15,
                    right: 25,
                    bottom: 15,
                    left: 0,
                  }}
                >
                  <CartesianGrid
                    stroke="#edf1f7"
                    strokeDasharray="4 4"
                  />

                  <XAxis
                    type="number"
                    dataKey="gasto"
                    name="Gasto acumulado"
                    unit=" S/"
                    tick={{
                      fontSize: 10,
                      fill: "#8493a6",
                    }}
                  />

                  <YAxis
                    type="number"
                    dataKey="visitas"
                    name="Visitas"
                    allowDecimals={false}
                    tick={{
                      fontSize: 10,
                      fill: "#8493a6",
                    }}
                  />

                  <ZAxis
                    type="number"
                    dataKey="size"
                    range={[80, 80]}
                  />

                  <Tooltip
                    cursor={{
                      strokeDasharray: "3 3",
                    }}
                    formatter={(value, name) => [
                      Number(value).toLocaleString(
                        "es-PE",
                      ),
                      String(name),
                    ]}
                  />

                  {scatterGroups.map((group) => (
                    <Scatter
                      key={group.id}
                      name={`Grupo ${group.id}`}
                      data={group.points}
                      fill={
                        COLORS[
                          group.id % COLORS.length
                        ]
                      }
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="seg-legend">
              {groups.map((group) => (
                <span key={group.id}>
                  <i
                    style={{
                      background:
                        COLORS[
                          group.id % COLORS.length
                        ],
                    }}
                  />
                  Grupo {group.id}
                </span>
              ))}
            </div>

            <p className="seg-explanation">
              Este gráfico muestra dos dimensiones
              para facilitar la visualización. El
              algoritmo también utiliza la antigüedad
              al calcular las distancias.
            </p>
          </section>

          <section className="seg-table-panel">
            <div className="seg-section-heading">
              <div>
                <span className="seg-eyebrow">
                  RESULTADOS INDIVIDUALES
                </span>

                <h3>Clientes segmentados</h3>

                <p>
                  Consulta el grupo de cada cliente
                  y ordena los resultados.
                </p>
              </div>
            </div>

            <div className="seg-table-toolbar">
              <label>
                <span>Filtrar segmento</span>

                <select
                  value={selectedSegment}
                  onChange={(event) =>
                    setSelectedSegment(
                      event.target.value,
                    )
                  }
                >
                  <option value="todos">
                    Todos los segmentos
                  </option>

                  {groups.map((group) => (
                    <option
                      key={group.id}
                      value={group.id}
                    >
                      Segmento {group.id}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>
                  <ArrowDownUp size={15} />
                  Ordenar clientes
                </span>

                <select
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(
                      event.target.value as SortOrder,
                    )
                  }
                >
                  <option value="gasto-desc">
                    Mayor gasto
                  </option>
                  <option value="gasto-asc">
                    Menor gasto
                  </option>
                  <option value="visitas-desc">
                    Más visitas
                  </option>
                  <option value="visitas-asc">
                    Menos visitas
                  </option>
                </select>
              </label>
            </div>

            <div className="seg-table-scroll">
              <table className="seg-table">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>CLIENTE</th>
                    <th>GASTO</th>
                    <th>VISITAS</th>
                    <th>ANTIGÜEDAD</th>
                    <th>SEGMENTO</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.id}</td>
                      <td>{customer.nombre}</td>
                      <td>
                        {moneyFormatter.format(
                          customer.gastoAcumulado,
                        )}
                      </td>
                      <td>{customer.visitas6Meses}</td>
                      <td>
                        {customer.antiguedadMeses} meses
                      </td>
                      <td>
                        <span className="seg-table-badge">
                          <i
                            style={{
                              background:
                                COLORS[
                                  (customer.segmento ?? 0) %
                                    COLORS.length
                                ],
                            }}
                          />

                          Grupo {customer.segmento}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="seg-table-footer">
              {filteredCustomers.length} clientes encontrados
            </div>
          </section>
        </>
      ) : (
        <section className="seg-empty-state">
          <div className="seg-empty-icon">
            <Database size={34} />
          </div>

          <h3>Aún no hay resultados de segmentación</h3>

          <p>
            Selecciona un valor K y ejecuta el
            algoritmo para descubrir grupos de clientes.
            Los resultados aparecerán aquí.
          </p>
        </section>
      )}

      <section className="seg-audit">
        <CalendarClock size={21} />

        <div>
          <strong>Auditoría de segmentación</strong>

          <p>
            {summary
              ? `Última ejecución: ${new Date(
                  summary.fechaEjecucion,
                ).toLocaleString("es-PE")} · ${summary.cantidadProcesada} registros procesados · K=${summary.k}`
              : "No se registran ejecuciones válidas."}
          </p>
          {summary && typeof summary.inercia === "number" && (
            <p>
              Inercia: {summary.inercia.toFixed(3)}
              {" · "}Iteraciones: {summary.iteraciones ?? "—"}
            </p>
          )}
        </div>
      </section>

      <p className="seg-disclaimer">
        Los segmentos representan similitud
        estadística. Sus números no identifican
        automáticamente categorías como cliente
        premium o frecuente.
      </p>
    </div>
  );
}
