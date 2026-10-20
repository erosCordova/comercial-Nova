import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  BarChart3,
  BrainCircuit,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Info,
  Lightbulb,
  Search,
  Target,
  UsersRound,
  Wallet,
} from "lucide-react";
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
  getStoredSegmentation,
} from "../../services/segmentationService";

import {
  buildCommercialRecommendations,
  buildCampaignSteps,
  simulateCampaign,
} from "../../services/recommendationsService";

import type {
  CommercialRecommendation,
  CampaignScenario,
  ComparisonLevel,
} from "../../services/recommendationsService";

import "./recommendations.css";

type Tab = "diagnostico" | "plan" | "simulador" | "clientes";

type SortMode =
  | "gasto-desc"
  | "gasto-asc"
  | "visitas-desc"
  | "visitas-asc";

interface PageData {
  customers: Customer[];
  summary: SegmentationSummary | null;
  error: string;
}

interface SavedProgress {
  token: string;
  completed: Record<string, boolean>;
}

const STORAGE_KEY =
  "comercial-nova:campaign-plan:v2";

const COLORS = [
  "#0aa8c5",
  "#8473e5",
  "#f0a04b",
  "#34b58e",
  "#d779a5",
];

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
          : "Error al cargar los datos.",
    };
  }
}

function readProgress(token: string): SavedProgress {
  const empty = { token, completed: {} };

  if (!token) return empty;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return empty;

    const parsed: unknown = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      "token" in parsed &&
      "completed" in parsed &&
      parsed.token === token &&
      parsed.completed &&
      typeof parsed.completed === "object" &&
      !Array.isArray(parsed.completed)
    ) {
      return {
        token,
        completed:
          parsed.completed as Record<string, boolean>,
      };
    }
  } catch {
    return empty;
  }

  return empty;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDifference(value: number): string {
  return `${value > 0.05 ? "+" : ""}${value.toFixed(1)}%`;
}

function levelLabel(level: ComparisonLevel): string {
  if (level === "superior") return "Superior al promedio";
  if (level === "inferior") return "Inferior al promedio";
  return "Cercano al promedio";
}

function csvCell(value: string | number): string {
  let text = String(value);

  if (
    typeof value === "string" &&
    /^[\s]*[=+@-]/.test(text)
  ) {
    text = "'" + text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function exportReport(
  rec: CommercialRecommendation,
  customers: Customer[],
  summary: SegmentationSummary,
  scenario: CampaignScenario,
) {
  const calculation = simulateCampaign(scenario);

  const rows: Array<Array<string | number>> = [
    ["TIPO", "CONCEPTO", "VALOR", "DETALLE"],
    ["General", "Proyecto", "Comercial Nova", ""],
    ["General", "Fecha segmentación", summary.fechaEjecucion, ""],
    ["General", "K utilizado", summary.k, ""],
    ["Perfil", "Grupo", rec.segmento, ""],
    ["Perfil", "Descripción", rec.perfil, ""],
    ["Perfil", "Clientes", rec.cantidad, ""],
    ["Perfil", "Gasto promedio", rec.gastoPromedio, ""],
    ["Perfil", "Visitas promedio", rec.visitasPromedio, ""],
    ["Perfil", "Antigüedad promedio", rec.antiguedadPromedio, ""],
    ["Estrategia", "Propuesta", rec.estrategia, ""],
    ["Estrategia", "Objetivo", rec.objetivo, ""],
    ["Estrategia", "Indicador", rec.indicador, ""],
    ["Estrategia", "Fundamento", rec.fundamento, ""],
  ];

  rec.acciones.forEach((action, index) => {
    rows.push([
      "Acción",
      `Acción ${index + 1}`,
      action,
      "",
    ]);
  });

  rows.push(
    ["Supuesto", "Cobertura (%)", scenario.cobertura, ""],
    ["Supuesto", "Respuesta (%)", scenario.respuesta, ""],
    ["Supuesto", "Ticket (S/)", scenario.ticket, ""],
    ["Supuesto", "Margen (%)", scenario.margen, ""],
    ["Supuesto", "Costo contacto (S/)", scenario.costoContacto, ""],
    ["Supuesto", "Costo fijo (S/)", scenario.costoFijo, ""],
    [
      "Simulación",
      "Ingreso hipotético (S/)",
      calculation.ingresosHipoteticos,
      "",
    ],
    [
      "Simulación",
      "Costo hipotético (S/)",
      calculation.costoTotal,
      "",
    ],
    [
      "Simulación",
      "Resultado hipotético (S/)",
      calculation.resultadoNeto,
      "",
    ],
    [
      "Aviso",
      "Limitación",
      "Escenario hipotético, no predicción de Machine Learning",
      "",
    ],
  );

  customers
    .filter((c) => c.segmento === rec.segmento)
    .forEach((c) => {
      rows.push([
        "Cliente",
        c.id,
        c.nombre,
        `Gasto ${c.gastoAcumulado}, visitas ${c.visitas6Meses}, antigüedad ${c.antiguedadMeses}`,
      ]);
    });

  const content =
    "\uFEFF" +
    rows.map(
      (row) => row.map(csvCell).join(";"),
    ).join("\r\n");

  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download =
    `comercial-nova-grupo-${rec.segmento}.csv`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function RecommendationsPage() {
  const [data, setData] = useState<PageData>(readData);

  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const [tab, setTab] = useState<Tab>("diagnostico");

  const [search, setSearch] = useState("");

  const [sort, setSort] =
    useState<SortMode>("gasto-desc");

  const [saveWarning, setSaveWarning] = useState("");

  const [scenario, setScenario] =
    useState<Omit<CampaignScenario, "audiencia">>({
      cobertura: 100,
      respuesta: 25,
      ticket: 100,
      margen: 35,
      costoContacto: 2,
      costoFijo: 0,
    });

  useEffect(() => {
    const refresh = () => setData(readData());

    const events = [
      "comercial-nova:customers-updated",
      "comercial-nova:segmentation-updated",
      "storage",
    ];

    events.forEach((event) =>
      window.addEventListener(event, refresh),
    );

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, refresh),
      );
    };
  }, []);

  const { customers, summary, error } = data;

  const recommendations = useMemo(
    () => buildCommercialRecommendations(customers, summary),
    [customers, summary],
  );

  const active =
    recommendations.find(
      (rec) => rec.segmento === selectedId,
    ) ?? recommendations[0];

  const token = summary
    ? `${summary.fechaEjecucion}:${summary.k}:${summary.cantidadProcesada}`
    : "";

  const [plan, setPlan] = useState<SavedProgress>(
    () => readProgress(token),
  );

  useEffect(() => {
    setPlan(readProgress(token));
    setSaveWarning("");
  }, [token]);

  const steps = useMemo(
    () => active ? buildCampaignSteps(active) : [],
    [active],
  );

  const completed =
    plan.token === token ? plan.completed : {};

  const doneCount = active
    ? steps.filter(
        (step) =>
          completed[`${active.segmento}:${step.id}`],
      ).length
    : 0;

  const completion = steps.length
    ? doneCount / steps.length * 100
    : 0;

  const avg = useMemo(() => {
    if (!customers.length) {
      return { gasto: 0, visitas: 0, antiguedad: 0 };
    }

    return {
      gasto:
        customers.reduce(
          (sum, c) => sum + c.gastoAcumulado,
          0,
        ) / customers.length,
      visitas:
        customers.reduce(
          (sum, c) => sum + c.visitas6Meses,
          0,
        ) / customers.length,
      antiguedad:
        customers.reduce(
          (sum, c) => sum + c.antiguedadMeses,
          0,
        ) / customers.length,
    };
  }, [customers]);

  const members = useMemo(() => {
    if (!active) return [];

    const term = search.trim().toLowerCase();

    return customers
      .filter(
        (c) =>
          c.segmento === active.segmento &&
          (
            !term ||
            c.nombre.toLowerCase().includes(term) ||
            c.id.toLowerCase().includes(term)
          ),
      )
      .sort((a, b) => {
        switch (sort) {
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
  }, [customers, active, search, sort]);

  const simulation = active
    ? simulateCampaign({
        audiencia: active.cantidad,
        ...scenario,
      })
    : null;

  function changeScenario(
    field: keyof typeof scenario,
    text: string,
    maximum?: number,
  ) {
    const parsed = Number(text);

    const value = Number.isFinite(parsed)
      ? Math.max(0, parsed)
      : 0;

    setScenario((previous) => ({
      ...previous,
      [field]:
        maximum === undefined
          ? value
          : Math.min(maximum, value),
    }));
  }

  function toggleTask(id: string) {
    if (!active || !token) return;

    const key = `${active.segmento}:${id}`;

    const next: SavedProgress = {
      token,
      completed: {
        ...completed,
        [key]: !completed[key],
      },
    };

    setPlan(next);
    setSaveWarning("");

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch {
      setSaveWarning(
        "El avance cambió en pantalla, pero no pudo guardarse.",
      );
    }
  }

  if (error) {
    return (
      <section className="nova-rec-panel nova-rec-empty">
        <AlertCircle size={32} />
        <h2>No se pudieron cargar las recomendaciones</h2>
        <p>{error}</p>
      </section>
    );
  }

  return (
    <div className="nova-rec">
      <header className="nova-rec-hero">
        <div>
          <span className="nova-rec-kicker">
            CENTRO DE INTELIGENCIA COMERCIAL
          </span>

          <h2>De los datos a las decisiones</h2>

          <p>
            Compara segmentos, organiza acciones,
            simula escenarios y genera reportes
            basados en los resultados de K-Means.
          </p>
        </div>

        <div className="nova-rec-hero-icon">
          <Lightbulb size={37} />
        </div>
      </header>

      {!summary || !active ? (
        <section className="nova-rec-panel nova-rec-empty">
          <BrainCircuit size={35} />

          <h3>No existe una segmentación válida</h3>

          <p>
            Ejecuta K-Means para generar propuestas
            comerciales a partir de los datos.
          </p>

          <Link to="/segmentacion" className="nova-rec-primary">
            Ir a Segmentación
          </Link>
        </section>
      ) : (
        <>
          <section className="nova-rec-kpis">
            <div>
              <BrainCircuit size={21} />
              <span>Segmentos</span>
              <strong>{recommendations.length}</strong>
            </div>

            <div>
              <UsersRound size={21} />
              <span>Clientes</span>
              <strong>{summary.cantidadProcesada}</strong>
            </div>

            <div>
              <Wallet size={21} />
              <span>Gasto promedio</span>
              <strong>
                {moneyFormatter.format(avg.gasto)}
              </strong>
            </div>

            <div>
              <CalendarClock size={21} />
              <span>Último análisis</span>
              <strong className="nova-rec-date">
                {new Date(
                  summary.fechaEjecucion,
                ).toLocaleDateString("es-PE")}
              </strong>
            </div>
          </section>

          <section className="nova-rec-panel">
            <div className="nova-rec-heading">
              <div>
                <span className="nova-rec-kicker">
                  COMPARACIÓN
                </span>

                <h3>Gasto promedio por segmento</h3>

                <p>
                  Selecciona una barra para analizar
                  ese grupo de clientes.
                </p>
              </div>

              <BarChart3 size={23} />
            </div>

            <div className="nova-rec-bars">
              {recommendations.map((rec) => {
                const max = Math.max(
                  1,
                  ...recommendations.map(
                    (r) => r.gastoPromedio,
                  ),
                );

                return (
                  <button
                    type="button"
                    key={rec.segmento}
                    onClick={() => setSelectedId(rec.segmento)}
                    className="nova-rec-bar"
                  >
                    <span>
                      Grupo {rec.segmento}
                      <small>{rec.cantidad} clientes</small>
                    </span>

                    <div className="nova-rec-track">
                      <div
                        style={{
                          background:
                            COLORS[
                              rec.segmento % COLORS.length
                            ],
                          width: `${
                            rec.gastoPromedio / max * 100
                          }%`,
                        }}
                      />
                    </div>

                    <strong>
                      {moneyFormatter.format(
                        rec.gastoPromedio,
                      )}
                    </strong>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="nova-rec-layout">
            <aside className="nova-rec-panel nova-rec-aside">
              <div className="nova-rec-heading">
                <div>
                  <span className="nova-rec-kicker">
                    PERFILES
                  </span>
                  <h3>Mis segmentos</h3>
                </div>
              </div>

              {recommendations.map((rec) => (
                <button
                  type="button"
                  key={rec.segmento}
                  onClick={() => {
                    setSelectedId(rec.segmento);
                    setSearch("");
                  }}
                  className={
                    "nova-rec-group" +
                    (active.segmento === rec.segmento
                      ? " is-active"
                      : "")
                  }
                >
                  <div>
                    <i
                      style={{
                        background:
                          COLORS[
                            rec.segmento % COLORS.length
                          ],
                      }}
                    />
                    <strong>Grupo {rec.segmento}</strong>
                    {active.segmento === rec.segmento && (
                      <CheckCircle2 size={17} />
                    )}
                  </div>

                  <p>{rec.perfil}</p>

                  <small>
                    {rec.cantidad} clientes ·{" "}
                    {formatPercent(rec.participacion)}
                  </small>
                </button>
              ))}

              <p className="nova-rec-aside-note">
                Los números de grupo son etiquetas
                técnicas y pueden cambiar al
                ejecutar otra segmentación.
              </p>
            </aside>

            <main className="nova-rec-main">
              <section className="nova-rec-panel nova-rec-header">
                <div className="nova-rec-heading">
                  <div>
                    <span className="nova-rec-kicker">
                      PERFIL SELECCIONADO
                    </span>

                    <h3>Grupo {active.segmento}</h3>
                    <p>{active.perfil}</p>
                  </div>

                  <strong className="nova-rec-share">
                    {formatPercent(active.participacion)}
                  </strong>
                </div>

                <nav
                  className="nova-rec-tabs"
                  aria-label="Herramientas comerciales"
                >
                  {(
                    [
                      ["diagnostico", "Diagnóstico"],
                      ["plan", "Plan de campaña"],
                      ["simulador", "Simulador"],
                      ["clientes", "Clientes y reporte"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setTab(value)}
                      className={
                        tab === value ? "is-active" : ""
                      }
                      aria-pressed={tab === value}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </section>

              {tab === "diagnostico" && (
                <>
                  <section className="nova-rec-panel">
                    <div className="nova-rec-heading">
                      <div>
                        <span className="nova-rec-kicker">
                          INTERPRETACIÓN
                        </span>

                        <h3>Radiografía del segmento</h3>

                        <p>
                          Comparación con los promedios
                          generales del negocio.
                        </p>
                      </div>

                      <Target size={23} />
                    </div>

                    <div className="nova-rec-comparisons">
                      {[
                        {
                          label: "Gasto acumulado",
                          value: moneyFormatter.format(
                            active.gastoPromedio,
                          ),
                          general: moneyFormatter.format(
                            avg.gasto,
                          ),
                          level: active.nivelGasto,
                          difference: active.diferenciaGasto,
                        },
                        {
                          label: "Visitas en seis meses",
                          value:
                            active.visitasPromedio.toFixed(2),
                          general: avg.visitas.toFixed(2),
                          level: active.nivelVisitas,
                          difference: active.diferenciaVisitas,
                        },
                        {
                          label: "Antigüedad en meses",
                          value:
                            active.antiguedadPromedio.toFixed(2),
                          general: avg.antiguedad.toFixed(2),
                          level: active.nivelAntiguedad,
                          difference: active.diferenciaAntiguedad,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="nova-rec-comparison"
                        >
                          <div>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                            <small>
                              Promedio general: {item.general}
                            </small>
                          </div>

                          <div className={`nova-rec-level ${item.level}`}>
                            <strong>
                              {formatDifference(
                                item.difference,
                              )}
                            </strong>
                            <small>
                              {levelLabel(item.level)}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="nova-rec-note">
                      <Info size={19} />
                      <p>{active.fundamento}</p>
                    </div>
                  </section>

                  <div className="nova-rec-double">
                    <section className="nova-rec-panel">
                      <span className="nova-rec-kicker">
                        ESTRATEGIA SUGERIDA
                      </span>

                      <h3>{active.estrategia}</h3>
                      <p>{active.objetivo}</p>

                      <div className="nova-rec-note">
                        <BarChart3 size={19} />
                        <p>
                          <strong>Indicador:</strong>{" "}
                          {active.indicador}
                        </p>
                      </div>
                    </section>

                    <section className="nova-rec-panel">
                      <span className="nova-rec-kicker">
                        ACCIONES PROPUESTAS
                      </span>

                      <h3>Oportunidades comerciales</h3>

                      <div className="nova-rec-actions">
                        {active.acciones.map(
                          (action, index) => (
                            <div key={index}>
                              <b>{index + 1}</b>
                              <p>{action}</p>
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}

              {tab === "plan" && (
                <section className="nova-rec-panel">
                  <div className="nova-rec-heading">
                    <div>
                      <span className="nova-rec-kicker">
                        PLANIFICACIÓN
                      </span>

                      <h3>Plan de campaña comercial</h3>

                      <p>
                        Organiza las actividades sin
                        ejecutar campañas automáticamente.
                      </p>
                    </div>

                    <ClipboardCheck size={23} />
                  </div>

                  <div className="nova-rec-progress-head">
                    <strong>
                      {doneCount} de {steps.length} tareas
                    </strong>

                    <span>
                      {formatPercent(completion)}
                    </span>
                  </div>

                  <div className="nova-rec-progress">
                    <div style={{ width: `${completion}%` }} />
                  </div>

                  {(
                    [
                      "Preparación",
                      "Prueba comercial",
                      "Evaluación",
                    ] as const
                  ).map((phase, index) => (
                    <div
                      key={phase}
                      className="nova-rec-phase"
                    >
                      <h4>
                        <span>{index + 1}</span>
                        {phase}
                      </h4>

                      {steps
                        .filter(
                          (step) => step.etapa === phase,
                        )
                        .map((step) => {
                          const key =
                            `${active.segmento}:${step.id}`;

                          return (
                            <label
                              key={key}
                              className="nova-rec-task"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  Boolean(completed[key])
                                }
                                onChange={() =>
                                  toggleTask(step.id)
                                }
                              />

                              <div>
                                <strong>{step.titulo}</strong>
                                <p>{step.detalle}</p>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  ))}

                  {saveWarning && (
                    <p role="alert" className="nova-rec-warning">
                      {saveWarning}
                    </p>
                  )}

                  <p className="nova-rec-aside-note">
                    El avance del plan se guarda en
                    este navegador. Marcar una tarea
                    no envía mensajes ni promociones.
                  </p>
                </section>
              )}

              {tab === "simulador" && simulation && (
                <section className="nova-rec-panel">
                  <div className="nova-rec-heading">
                    <div>
                      <span className="nova-rec-kicker">
                        ESCENARIOS HIPOTÉTICOS
                      </span>

                      <h3>Simulador de campaña</h3>

                      <p>
                        Ajusta los valores para conocer
                        distintos escenarios económicos.
                      </p>
                    </div>

                    <Calculator size={23} />
                  </div>

                  <div className="nova-rec-simulator">
                    <div className="nova-rec-fields">
                      {(
                        [
                          ["cobertura", "Cobertura (%)", 100],
                          ["respuesta", "Respuesta supuesta (%)", 100],
                          ["ticket", "Compra adicional (S/)", undefined],
                          ["margen", "Margen bruto (%)", 100],
                          ["costoContacto", "Costo por contacto (S/)", undefined],
                          ["costoFijo", "Costo fijo (S/)", undefined],
                        ] as const
                      ).map(([field, label, maximum]) => (
                        <label key={field}>
                          <span>{label}</span>

                          <input
                            type="number"
                            min={0}
                            max={maximum}
                            step="any"
                            value={scenario[field]}
                            onChange={(event) =>
                              changeScenario(
                                field,
                                event.target.value,
                                maximum,
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>

                    <div className="nova-rec-results">
                      <h4>Resultado del escenario</h4>

                      {[
                        [
                          "Contactos teóricos",
                          simulation.contactosEsperados.toFixed(2),
                        ],
                        [
                          "Compras esperadas*",
                          simulation.comprasEsperadas.toFixed(2),
                        ],
                        [
                          "Ingresos adicionales hipotéticos",
                          moneyFormatter.format(
                            simulation.ingresosHipoteticos,
                          ),
                        ],
                        [
                          "Margen bruto hipotético",
                          moneyFormatter.format(
                            simulation.margenHipotetico,
                          ),
                        ],
                        [
                          "Costo total",
                          moneyFormatter.format(
                            simulation.costoTotal,
                          ),
                        ],
                        [
                          "Resultado neto hipotético",
                          moneyFormatter.format(
                            simulation.resultadoNeto,
                          ),
                        ],
                        [
                          "Retorno hipotético",
                          simulation.roi === null
                            ? "No calculable"
                            : formatPercent(simulation.roi),
                        ],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="nova-rec-note">
                    <Info size={19} />
                    <p>
                      *Los valores fraccionarios son
                      expectativas matemáticas, no compras
                      confirmadas. La respuesta, el margen
                      y los costos son supuestos configurables.
                      K-Means no predice estos valores.
                    </p>
                  </div>
                </section>
              )}

              {tab === "clientes" && (
                <section className="nova-rec-panel">
                  <div className="nova-rec-heading">
                    <div>
                      <span className="nova-rec-kicker">
                        REGISTROS Y REPORTE
                      </span>

                      <h3>
                        Clientes del Grupo {active.segmento}
                      </h3>

                      <p>
                        Consulta, ordena y exporta
                        los datos del grupo.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="nova-rec-primary"
                      onClick={() => {
                        exportReport(
                          active,
                          customers,
                          summary,
                          {
                            audiencia: active.cantidad,
                            ...scenario,
                          },
                        );
                      }}
                    >
                      <Download size={16} />
                      Exportar CSV
                    </button>
                  </div>

                  <div className="nova-rec-filters">
                    <label>
                      <Search size={16} />

                      <input
                        placeholder="Buscar cliente o código"
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                      />
                    </label>

                    <label>
                      <ArrowDownUp size={16} />

                      <select
                        value={sort}
                        onChange={(event) =>
                          setSort(
                            event.target.value as SortMode,
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

                  <div className="nova-rec-table-scroll">
                    <table className="nova-rec-table">
                      <thead>
                        <tr>
                          <th>CÓDIGO</th>
                          <th>CLIENTE</th>
                          <th>GASTO</th>
                          <th>VISITAS</th>
                          <th>ANTIGÜEDAD</th>
                        </tr>
                      </thead>

                      <tbody>
                        {members.map((customer) => (
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {members.length === 0 && (
                    <p>No se encontraron clientes.</p>
                  )}

                  <p className="nova-rec-count">
                    {members.length} de {active.cantidad} clientes
                  </p>
                </section>
              )}
            </main>
          </div>
        </>
      )}

      <footer className="nova-rec-footer">
        <Info size={19} />

        <p>
          Los perfiles y las estrategias son orientativos.
          Las simulaciones no representan predicciones
          del modelo ni garantizan rentabilidad.
        </p>
      </footer>
    </div>
  );
}
