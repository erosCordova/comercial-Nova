import type {
  Customer,
  SegmentationSummary,
  SegmentGroup,
} from "../types";

import {
  getCustomers,
} from "./customerService";

import {
  validateSegmentationSummary,
} from "./dashboardMetrics";

const CUSTOMER_KEY =
  "comercial-nova:customers:v1";

const SUMMARY_KEY =
  "comercial-nova:segmentation:v1";

const BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

export interface KMeansMetadata {
  inercia: number;
  iteraciones: number;
  tiempoEjecucionMs: number;
}

export interface SegmentationResult {
  customers: Customer[];
  summary: SegmentationSummary;
  metadata: KMeansMetadata;
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function snapshot(customers: Customer[]): string {
  return JSON.stringify(
    [...customers]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((customer) => ({
        id: customer.id,
        nombre: customer.nombre,
        gastoAcumulado: customer.gastoAcumulado,
        visitas6Meses: customer.visitas6Meses,
        antiguedadMeses: customer.antiguedadMeses,
      })),
  );
}

export function getStoredSegmentation(
  customers: Customer[],
): SegmentationSummary | null {
  return validateSegmentationSummary(
    localStorage.getItem(SUMMARY_KEY),
    customers,
  );
}

function validateResponse(
  payload: unknown,
  customers: Customer[],
  k: number,
): {
  assigned: Customer[];
  summary: SegmentationSummary;
  metadata: KMeansMetadata;
} {
  if (
    !isObject(payload) ||
    payload.k !== k ||
    !Array.isArray(payload.labels) ||
    !Array.isArray(payload.groups) ||
    payload.groups.length !== k ||
    payload.labels.length !== customers.length ||
    payload.cantidadProcesada !== customers.length ||
    !Number.isFinite(payload.tiempoEjecucionMs) ||
    (payload.tiempoEjecucionMs as number) < 0 ||
    typeof payload.fechaEjecucion !== "string" ||
    !Number.isFinite(Date.parse(payload.fechaEjecucion))
  ) {
    throw new Error(
      "La API devolvió una respuesta incompleta o inválida.",
    );
  }

  const assignments = new Map<string, number>();

  for (const label of payload.labels) {
    if (
      !isObject(label) ||
      typeof label.id !== "string" ||
      !Number.isInteger(label.segmento) ||
      (label.segmento as number) < 0 ||
      (label.segmento as number) >= k ||
      assignments.has(label.id)
    ) {
      throw new Error(
        "La API devolvió asignaciones de grupo inválidas.",
      );
    }

    assignments.set(
      label.id,
      label.segmento as number,
    );
  }

  const assigned = customers.map((customer) => {
    const segment = assignments.get(customer.id);

    if (segment === undefined) {
      throw new Error(
        `La API no procesó al cliente ${customer.id}.`,
      );
    }

    return {
      ...customer,
      segmento: segment,
    };
  });

  const groups: SegmentGroup[] = [];

  for (const group of payload.groups) {
    if (
      !isObject(group) ||
      !Number.isInteger(group.segmento) ||
      (group.segmento as number) < 0 ||
      (group.segmento as number) >= k ||
      !Number.isInteger(group.cantidad) ||
      (group.cantidad as number) <= 0 ||
      !Number.isFinite(group.gastoPromedio) ||
      !Number.isFinite(group.visitasPromedio) ||
      !Number.isFinite(group.antiguedadPromedio)
    ) {
      throw new Error(
        "La API devolvió estadísticas de grupo inválidas.",
      );
    }

    groups.push({
      id: group.segmento as number,
      cantidad: group.cantidad as number,
      gastoPromedio: group.gastoPromedio as number,
      visitasPromedio: group.visitasPromedio as number,
      antiguedadPromedio:
        group.antiguedadPromedio as number,
    });
  }

  const summary: SegmentationSummary = {
    k,
    fechaEjecucion: payload.fechaEjecucion,
    tiempoEjecucionMs: payload.tiempoEjecucionMs as number,
    inercia: payload.inercia as number,
    iteraciones: payload.iteraciones as number,
    cantidadProcesada: customers.length,
    grupos: groups,
  };

  const summaryCheck = validateSegmentationSummary(
    JSON.stringify(summary),
    assigned,
  );

  if (!summaryCheck) {
    throw new Error(
      "Las cantidades de los grupos no coinciden con los clientes.",
    );
  }

  for (const group of groups) {
    const members = assigned.filter(
      (customer) => customer.segmento === group.id,
    );

    const average = (
      select: (customer: Customer) => number,
    ) =>
      members.reduce(
        (sum, customer) => sum + select(customer),
        0,
      ) / members.length;

    if (
      Math.abs(
        average((c) => c.gastoAcumulado) -
          group.gastoPromedio,
      ) > 0.01 ||
      Math.abs(
        average((c) => c.visitas6Meses) -
          group.visitasPromedio,
      ) > 0.01 ||
      Math.abs(
        average((c) => c.antiguedadMeses) -
          group.antiguedadPromedio,
      ) > 0.01
    ) {
      throw new Error(
        "Los promedios de los grupos son inconsistentes.",
      );
    }
  }

  if (
    !Number.isFinite(payload.inercia) ||
    (payload.inercia as number) < 0 ||
    !Number.isInteger(payload.iteraciones) ||
    (payload.iteraciones as number) < 1
  ) {
    throw new Error(
      "Las métricas del algoritmo son inválidas.",
    );
  }

  return {
    assigned,
    summary,
    metadata: {
      inercia: payload.inercia as number,
      iteraciones: payload.iteraciones as number,
      tiempoEjecucionMs: payload.tiempoEjecucionMs as number,
    },
  };
}

export async function runSegmentation(
  customers: Customer[],
  k: number,
): Promise<SegmentationResult> {
  if (!Number.isInteger(k) || k < 2 || k > 5) {
    throw new Error(
      "K debe ser un número entero entre 2 y 5.",
    );
  }

  if (customers.length < k) {
    throw new Error(
      `Se necesitan al menos ${k} clientes válidos.`,
    );
  }

  const initialSnapshot = snapshot(customers);

  let response: Response;

  try {
    response = await fetch(
      `${BASE_URL}/api/segmentation/run`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          k,
          customers: customers.map((customer) => ({
            id: customer.id,
            gastoAcumulado: customer.gastoAcumulado,
            visitas6Meses: customer.visitas6Meses,
            antiguedadMeses: customer.antiguedadMeses,
          })),
        }),
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError")
    ) {
      throw new Error(
        "El cálculo superó el tiempo de espera de 30 segundos.",
      );
    }

    throw new Error(
      "No se pudo conectar con la API Python. Comprueba la conexión y la URL configurada.",
    );
  }

  const payload: unknown = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    const detail =
      isObject(payload) &&
      typeof payload.detail === "string"
        ? payload.detail
        : `Error HTTP ${response.status}`;

    throw new Error(detail);
  }

  const validated = validateResponse(
    payload,
    customers,
    k,
  );

  // Evita guardar resultados sobre datos modificados
  // durante la ejecución del algoritmo.
  const currentCustomers = getCustomers();

  if (
    snapshot(currentCustomers) !== initialSnapshot
  ) {
    throw new Error(
      "Los clientes cambiaron durante el análisis. Ejecuta nuevamente K-Means.",
    );
  }

  const oldCustomers = localStorage.getItem(
    CUSTOMER_KEY,
  );

  const oldSummary = localStorage.getItem(
    SUMMARY_KEY,
  );

  try {
    localStorage.setItem(
      CUSTOMER_KEY,
      JSON.stringify(validated.assigned),
    );

    localStorage.setItem(
      SUMMARY_KEY,
      JSON.stringify(validated.summary),
    );
  } catch {
    // Intentar restaurar el estado previo si falla
    // alguna escritura.
    try {
      if (oldCustomers === null) {
        localStorage.removeItem(CUSTOMER_KEY);
      } else {
        localStorage.setItem(
          CUSTOMER_KEY,
          oldCustomers,
        );
      }

      if (oldSummary === null) {
        localStorage.removeItem(SUMMARY_KEY);
      } else {
        localStorage.setItem(
          SUMMARY_KEY,
          oldSummary,
        );
      }
    } catch {
      // La siguiente lectura detectará inconsistencias.
    }

    throw new Error(
      "No se pudieron guardar los resultados en el navegador.",
    );
  }

  window.dispatchEvent(
    new Event("comercial-nova:customers-updated"),
  );

  window.dispatchEvent(
    new Event("comercial-nova:segmentation-updated"),
  );

  return {
    customers: validated.assigned,
    summary: validated.summary,
    metadata: validated.metadata,
  };
}
