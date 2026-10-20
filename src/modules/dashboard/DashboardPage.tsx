import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarClock,
  CircleAlert,
  Database,
  Sparkles,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Link } from "react-router-dom";

import type {
  Customer,
  SegmentationSummary,
} from "../../types";

import {
  getCustomers,
  moneyFormatter,
} from "../../services/customerService";

import {
  calculateDashboardMetrics,
  validateSegmentationSummary,
} from "../../services/dashboardMetrics";

import "./dashboard.css";

const SUMMARY_KEY =
  "comercial-nova:segmentation:v1";

const COLORS = [
  "#09abc5",
  "#8172e6",
  "#efa050",
  "#33b891",
  "#dc76a8",
];

interface DashboardData {
  customers: Customer[];
  summary: SegmentationSummary | null;
  error: string;
}

function loadDashboard(): DashboardData {
  try {
    const customers = getCustomers();

    const summary = validateSegmentationSummary(
      localStorage.getItem(SUMMARY_KEY),
      customers,
    );

    return {
      customers,
      summary,
      error: "",
    };
  } catch (error) {
    return {
      customers: [],
      summary: null,
      error:
        error instanceof Error
          ? error.message
          : "Error al cargar la información.",
    };
  }
}

function MetricCard({
  title,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  caption: string;
  icon: typeof UsersRound;
  tone: string;
}) {
  return (
    <article className="dash-metric">
      <div className={`dash-metric-icon ${tone}`}>
        <Icon size={23} />
      </div>

      <span className="dash-metric-title">{title}</span>

      <strong className="dash-metric-value">
        {value}
      </strong>

      <span className="dash-metric-caption">
        {caption}
      </span>
    </article>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(
    loadDashboard,
  );

  useEffect(() => {
    function refresh() {
      setData(loadDashboard());
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

  const metrics = useMemo(
    () => calculateDashboardMetrics(customers, summary),
    [customers, summary],
  );

  const topCustomers = useMemo(
    () =>
      [...customers]
        .sort(
          (a, b) =>
            b.gastoAcumulado - a.gastoAcumulado ||
            a.id.localeCompare(b.id),
        )
        .slice(0, 6)
        .map((customer) => ({
          codigo: customer.id,
          nombre: customer.nombre,
          gasto: customer.gastoAcumulado,
        })),
    [customers],
  );

  const segments = useMemo(
    () =>
      summary
        ? [...summary.grupos]
            .sort((a, b) => a.id - b.id)
            .map((group) => ({
              nombre: `Grupo ${group.id}`,
              clientes: group.cantidad,
              id: group.id,
            }))
        : [],
    [summary],
  );

  if (error) {
    return (
      <section className="dash-error">
        <CircleAlert size={34} />

        <h2>No se pudieron cargar los indicadores</h2>

        <p>{error}</p>

        <p>
          Los datos almacenados no se modificarán
          automáticamente.
        </p>
      </section>
    );
  }

  return (
    <div className="nova-dashboard">
      <section className="dash-hero">
        <div className="dash-hero-content">
          <span className="dash-hero-tag">
            <Sparkles size={15} />
            INTELIGENCIA COMERCIAL
          </span>

          <h2>
            Conoce a tus clientes.
            <span> Decide con datos.</span>
          </h2>

          <p>
            Analiza el comportamiento de compra,
            descubre patrones y transforma la
            información en oportunidades comerciales.
          </p>

          <Link
            to="/clientes"
            className="dash-hero-button"
          >
            Gestionar clientes
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="dash-hero-graphic" aria-hidden="true">
          <div className="dash-orbit first" />
          <div className="dash-orbit second" />

          <div className="dash-graphic-center">
            <BrainCircuit size={51} />
          </div>

          <span className="dash-dot dot-a" />
          <span className="dash-dot dot-b" />
          <span className="dash-dot dot-c" />
        </div>
      </section>

      <section
        className="dash-metrics-grid"
        aria-label="Indicadores principales"
      >
        <MetricCard
          title="Total de clientes"
          value={metrics.totalClientes.toLocaleString("es-PE")}
          caption="Clientes registrados"
          icon={UsersRound}
          tone="metric-blue"
        />

        <MetricCard
          title="Gasto promedio"
          value={moneyFormatter.format(metrics.gastoPromedio)}
          caption="Gasto acumulado por cliente"
          icon={Wallet}
          tone="metric-cyan"
        />

        <MetricCard
          title="Visitas promedio"
          value={metrics.visitasPromedio.toFixed(2)}
          caption="Visitas en los últimos 6 meses"
          icon={Activity}
          tone="metric-purple"
        />

        <MetricCard
          title="Segmentos detectados"
          value={String(metrics.segmentosDetectados)}
          caption={
            summary
              ? `Agrupamiento con K = ${summary.k}`
              : "Sin segmentación ejecutada"
          }
          icon={BrainCircuit}
          tone="metric-orange"
        />
      </section>

      <section className="dash-charts-grid">
        <article className="dash-panel">
          <header className="dash-panel-header">
            <div>
              <span className="dash-section-tag">
                COMPORTAMIENTO DE COMPRA
              </span>

              <h3>Clientes con mayor gasto</h3>

              <p>
                Los seis clientes con mayor gasto
                acumulado en soles.
              </p>
            </div>

            <Wallet size={21} />
          </header>

          {topCustomers.length ? (
            <div className="dash-chart">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={topCustomers}
                  layout="vertical"
                  margin={{
                    top: 10,
                    right: 15,
                    bottom: 5,
                    left: 0,
                  }}
                >
                  <CartesianGrid
                    stroke="#edf1f7"
                    strokeDasharray="4 4"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fill: "#8394a7",
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    type="category"
                    dataKey="codigo"
                    width={46}
                    tick={{
                      fill: "#60768b",
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    formatter={(value) =>
                      moneyFormatter.format(Number(value))
                    }
                    labelFormatter={(label) => {
                      const client = topCustomers.find(
                        (item) => item.codigo === label,
                      );
                      return client
                        ? `${client.nombre} (${client.codigo})`
                        : String(label);
                    }}
                  />

                  <Bar
                    dataKey="gasto"
                    name="Gasto acumulado"
                    fill="#0cacc6"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={27}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dash-empty">
              <Database size={30} />
              <strong>Sin información disponible</strong>
              <p>
                Registra clientes para visualizar el gráfico.
              </p>
            </div>
          )}
        </article>

        <article className="dash-panel">
          <header className="dash-panel-header">
            <div>
              <span className="dash-section-tag">
                APRENDIZAJE NO SUPERVISADO
              </span>

              <h3>Distribución por segmentos</h3>

              <p>
                Número de clientes agrupados
                mediante K-Means.
              </p>
            </div>

            <BarChart3 size={21} />
          </header>

          {summary && segments.length > 0 ? (
            <>
              <div className="dash-chart">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={segments}
                    margin={{
                      top: 10,
                      right: 10,
                      bottom: 5,
                      left: -15,
                    }}
                  >
                    <CartesianGrid
                      stroke="#edf1f7"
                      strokeDasharray="4 4"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="nombre"
                      tick={{
                        fill: "#71849a",
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fill: "#8394a7",
                        fontSize: 10,
                      }}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="clientes"
                      name="Clientes"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={55}
                    >
                      {segments.map((segment) => (
                        <Cell
                          key={segment.id}
                          fill={
                            COLORS[
                              segment.id % COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="dash-chart-note">
                Los identificadores de grupo son
                etiquetas técnicas, no categorías
                comerciales predefinidas.
              </p>
            </>
          ) : (
            <div className="dash-empty">
              <div className="dash-empty-icon">
                <BrainCircuit size={29} />
              </div>

              <strong>Segmentación pendiente</strong>

              <p>
                Selecciona K y ejecuta el algoritmo
                para descubrir grupos de clientes.
              </p>

              <Link to="/segmentacion">
                Ir a Segmentación
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </article>
      </section>

      <section className="dash-audit">
        <div className="dash-audit-icon">
          <CalendarClock size={24} />
        </div>

        <div className="dash-audit-details">
          <h3>Última ejecución de K-Means</h3>

          {summary ? (
            <p>
              {new Date(
                summary.fechaEjecucion,
              ).toLocaleString("es-PE")}{" "}
              · {summary.cantidadProcesada} clientes
              procesados · K = {summary.k}
            </p>
          ) : (
            <p>
              Todavía no se ha ejecutado una
              segmentación válida para los datos actuales.
            </p>
          )}
        </div>

        <span
          className={
            summary
              ? "dash-audit-badge ready"
              : "dash-audit-badge pending"
          }
        >
          {summary ? "Disponible" : "Pendiente"}
        </span>
      </section>
    </div>
  );
}
