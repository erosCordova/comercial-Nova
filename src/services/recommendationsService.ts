import type {
  Customer,
  SegmentationSummary,
} from "../types";

export type ComparisonLevel =
  | "superior"
  | "similar"
  | "inferior";

export interface CommercialRecommendation {
  segmento: number;
  cantidad: number;
  participacion: number;

  gastoPromedio: number;
  visitasPromedio: number;
  antiguedadPromedio: number;

  nivelGasto: ComparisonLevel;
  nivelVisitas: ComparisonLevel;
  nivelAntiguedad: ComparisonLevel;

  diferenciaGasto: number;
  diferenciaVisitas: number;
  diferenciaAntiguedad: number;

  perfil: string;
  objetivo: string;
  estrategia: string;
  fundamento: string;
  acciones: string[];
  indicador: string;
}

interface Campaign {
  perfil: string;
  objetivo: string;
  estrategia: string;
  acciones: string[];
  indicador: string;
}

function compareLevel(
  value: number,
  average: number,
): ComparisonLevel {
  if (average <= 0) return "similar";

  const difference = (value - average) / average;

  if (difference >= 0.15) return "superior";
  if (difference <= -0.15) return "inferior";

  return "similar";
}

function differencePercent(
  value: number,
  average: number,
): number {
  if (average <= 0) return 0;

  return ((value - average) / average) * 100;
}

function chooseCampaign(
  spending: ComparisonLevel,
  visits: ComparisonLevel,
  tenure: ComparisonLevel,
): Campaign {
  if (
    spending === "superior" &&
    visits === "superior"
  ) {
    return {
      perfil: "Mayor gasto y frecuencia",
      objetivo:
        "Fortalecer la relación con clientes de alta actividad.",
      estrategia:
        "Programa de fidelización y reconocimiento",
      acciones: [
        "Proponer beneficios para compras recurrentes.",
        "Evaluar acceso anticipado a productos relevantes.",
        "Personalizar ofertas según hábitos de compra observados.",
      ],
      indicador:
        "Retención, frecuencia de recompra y margen.",
    };
  }

  if (
    spending === "superior" &&
    visits === "inferior"
  ) {
    return {
      perfil: "Gasto elevado y visitas reducidas",
      objetivo:
        "Explorar oportunidades para aumentar la recurrencia.",
      estrategia:
        "Campañas de continuidad comercial",
      acciones: [
        "Identificar productos complementarios.",
        "Probar incentivos para próximas compras.",
        "Comparar la frecuencia de visitas antes y después.",
      ],
      indicador:
        "Frecuencia de recompra y margen comercial.",
    };
  }

  if (
    spending === "inferior" &&
    visits === "superior"
  ) {
    return {
      perfil: "Frecuencia elevada y menor gasto",
      objetivo:
        "Evaluar oportunidades para incrementar el gasto por visita.",
      estrategia:
        "Productos complementarios y promociones combinadas",
      acciones: [
        "Diseñar combinaciones de productos relacionados.",
        "Probar recomendaciones durante el proceso de compra.",
        "Comparar el importe promedio por visita.",
      ],
      indicador:
        "Importe promedio por visita y margen.",
    };
  }

  if (
    spending === "inferior" &&
    visits === "inferior"
  ) {
    return {
      perfil: "Menor gasto y menor frecuencia",
      objetivo:
        "Investigar las oportunidades de reactivación.",
      estrategia:
        "Campaña de reactivación comercial",
      acciones: [
        "Evaluar ofertas de entrada y promociones de prueba.",
        "Consultar preferencias cuando sea apropiado.",
        "Medir la respuesta antes de ampliar la campaña.",
      ],
      indicador:
        "Tasa de reactivación y coste de campaña.",
    };
  }

  if (tenure === "superior") {
    return {
      perfil: "Relación comercial consolidada",
      objetivo:
        "Mejorar la permanencia y satisfacción.",
      estrategia:
        "Reconocimiento de antigüedad y fidelización",
      acciones: [
        "Evaluar beneficios por permanencia.",
        "Solicitar opiniones sobre la experiencia de compra.",
        "Probar comunicaciones comerciales relevantes.",
      ],
      indicador:
        "Retención y frecuencia de recompra.",
    };
  }

  if (tenure === "inferior") {
    return {
      perfil: "Relación comercial reciente",
      objetivo:
        "Facilitar la continuidad de las compras.",
      estrategia:
        "Acompañamiento y seguimiento comercial",
      acciones: [
        "Presentar productos de interés general.",
        "Facilitar información sobre servicios y beneficios.",
        "Evaluar la tasa de segunda compra.",
      ],
      indicador:
        "Segunda compra y recurrencia.",
    };
  }

  return {
    perfil: "Comportamiento intermedio",
    objetivo:
      "Identificar nuevas oportunidades de consumo.",
    estrategia:
      "Campañas exploratorias y promociones relevantes",
    acciones: [
      "Comparar diferentes propuestas comerciales.",
      "Evaluar productos de categorías relacionadas.",
      "Conservar las iniciativas con mejores resultados.",
    ],
    indicador:
      "Respuesta a campañas y valor de compra.",
  };
}

export function buildCommercialRecommendations(
  customers: Customer[],
  summary: SegmentationSummary | null,
): CommercialRecommendation[] {
  if (
    !summary ||
    customers.length === 0 ||
    !Number.isInteger(summary.k) ||
    summary.k < 2 ||
    summary.k > 5 ||
    summary.cantidadProcesada !== customers.length ||
    !Array.isArray(summary.grupos) ||
    summary.grupos.length !== summary.k
  ) {
    return [];
  }

  const total = customers.length;

  const average = (
    items: Customer[],
    select: (customer: Customer) => number,
  ): number => {
    if (items.length === 0) return 0;

    return (
      items.reduce(
        (sum, item) => sum + select(item),
        0,
      ) / items.length
    );
  };

  const globalSpending = average(
    customers,
    (c) => c.gastoAcumulado,
  );

  const globalVisits = average(
    customers,
    (c) => c.visitas6Meses,
  );

  const globalTenure = average(
    customers,
    (c) => c.antiguedadMeses,
  );

  const identifiers = new Set<number>();

  for (const group of summary.grupos) {
    if (
      !Number.isInteger(group.id) ||
      group.id < 0 ||
      group.id >= summary.k ||
      identifiers.has(group.id) ||
      !Number.isInteger(group.cantidad) ||
      group.cantidad < 1 ||
      !Number.isFinite(group.gastoPromedio) ||
      !Number.isFinite(group.visitasPromedio) ||
      !Number.isFinite(group.antiguedadPromedio) ||
      group.gastoPromedio < 0 ||
      group.visitasPromedio < 0 ||
      group.antiguedadPromedio < 0
    ) {
      return [];
    }

    identifiers.add(group.id);

    const members = customers.filter(
      (c) => c.segmento === group.id,
    );

    if (members.length !== group.cantidad) {
      return [];
    }

    if (
      Math.abs(
        average(members, (c) => c.gastoAcumulado) -
          group.gastoPromedio,
      ) > 0.01 ||
      Math.abs(
        average(members, (c) => c.visitas6Meses) -
          group.visitasPromedio,
      ) > 0.01 ||
      Math.abs(
        average(members, (c) => c.antiguedadMeses) -
          group.antiguedadPromedio,
      ) > 0.01
    ) {
      return [];
    }
  }

  if (
    customers.some(
      (c) =>
        c.segmento === undefined ||
        !identifiers.has(c.segmento),
    )
  ) {
    return [];
  }

  return [...summary.grupos]
    .sort((a, b) => a.id - b.id)
    .map((group) => {
      const spending = compareLevel(
        group.gastoPromedio,
        globalSpending,
      );

      const visits = compareLevel(
        group.visitasPromedio,
        globalVisits,
      );

      const tenure = compareLevel(
        group.antiguedadPromedio,
        globalTenure,
      );

      const campaign = chooseCampaign(
        spending,
        visits,
        tenure,
      );

      return {
        segmento: group.id,
        cantidad: group.cantidad,
        participacion:
          (group.cantidad / total) * 100,

        gastoPromedio: group.gastoPromedio,
        visitasPromedio: group.visitasPromedio,
        antiguedadPromedio:
          group.antiguedadPromedio,

        nivelGasto: spending,
        nivelVisitas: visits,
        nivelAntiguedad: tenure,

        diferenciaGasto: differencePercent(
          group.gastoPromedio,
          globalSpending,
        ),

        diferenciaVisitas: differencePercent(
          group.visitasPromedio,
          globalVisits,
        ),

        diferenciaAntiguedad: differencePercent(
          group.antiguedadPromedio,
          globalTenure,
        ),

        ...campaign,

        fundamento:
          `En comparación con el conjunto de clientes, ` +
          `el grupo presenta un nivel de gasto ${spending}, ` +
          `una frecuencia de visitas ${visits} ` +
          `y una antigüedad ${tenure}. ` +
          `La estrategia propuesta debe comprobarse ` +
          `antes de utilizarse comercialmente.`,
      };
    });
}

export interface CampaignScenario {
  audiencia: number;
  cobertura: number;
  respuesta: number;
  ticket: number;
  margen: number;
  costoContacto: number;
  costoFijo: number;
}

export interface CampaignSimulation {
  contactosEsperados: number;
  comprasEsperadas: number;
  ingresosHipoteticos: number;
  margenHipotetico: number;
  costoTotal: number;
  resultadoNeto: number;
  roi: number | null;
}

export interface CampaignStep {
  id: string;
  etapa: "Preparación" | "Prueba comercial" | "Evaluación";
  titulo: string;
  detalle: string;
}

export function simulateCampaign(
  input: CampaignScenario,
): CampaignSimulation {
  if (
    Object.values(input).some(
      (value) => !Number.isFinite(value) || value < 0,
    ) ||
    input.cobertura > 100 ||
    input.respuesta > 100 ||
    input.margen > 100
  ) {
    throw new Error("Supuestos económicos inválidos.");
  }

  const contactosEsperados =
    input.audiencia * input.cobertura / 100;

  const comprasEsperadas =
    contactosEsperados * input.respuesta / 100;

  const ingresosHipoteticos =
    comprasEsperadas * input.ticket;

  const margenHipotetico =
    ingresosHipoteticos * input.margen / 100;

  const costoTotal =
    contactosEsperados * input.costoContacto +
    input.costoFijo;

  const resultadoNeto =
    margenHipotetico - costoTotal;

  return {
    contactosEsperados,
    comprasEsperadas,
    ingresosHipoteticos,
    margenHipotetico,
    costoTotal,
    resultadoNeto,
    roi:
      costoTotal > 0
        ? resultadoNeto / costoTotal * 100
        : null,
  };
}

export function buildCampaignSteps(
  rec: CommercialRecommendation,
): CampaignStep[] {
  return [
    {
      id: "diagnostico",
      etapa: "Preparación",
      titulo: "Validar el diagnóstico comercial",
      detalle:
        `Revisar el perfil de los ${rec.cantidad} clientes del grupo.`,
    },
    {
      id: "propuesta",
      etapa: "Preparación",
      titulo: "Preparar la propuesta",
      detalle: rec.acciones[0],
    },
    {
      id: "piloto",
      etapa: "Prueba comercial",
      titulo: "Diseñar una campaña piloto",
      detalle:
        "Establecer el grupo de prueba, las condiciones y el presupuesto.",
    },
    {
      id: "ejecucion",
      etapa: "Prueba comercial",
      titulo: "Realizar la acción comercial",
      detalle: rec.acciones[1],
    },
    {
      id: "medicion",
      etapa: "Evaluación",
      titulo: "Medir resultados",
      detalle: `Indicador: ${rec.indicador}`,
    },
    {
      id: "mejoras",
      etapa: "Evaluación",
      titulo: "Documentar mejoras",
      detalle: rec.acciones[2],
    },
  ];
}
