import type {
  Customer,
  SegmentationSummary,
} from "../types";

export interface DashboardMetrics {
  totalClientes: number;
  gastoPromedio: number;
  visitasPromedio: number;
  segmentosDetectados: number;
}

export function calculateDashboardMetrics(
  customers: Customer[],
  summary: SegmentationSummary | null,
): DashboardMetrics {
  const total = customers.length;

  const totalGasto = customers.reduce(
    (sum, customer) => sum + customer.gastoAcumulado,
    0,
  );

  const totalVisitas = customers.reduce(
    (sum, customer) => sum + customer.visitas6Meses,
    0,
  );

  return {
    totalClientes: total,
    gastoPromedio: total > 0 ? totalGasto / total : 0,
    visitasPromedio: total > 0 ? totalVisitas / total : 0,
    segmentosDetectados: summary?.grupos.length ?? 0,
  };
}

export function validateSegmentationSummary(
  raw: string | null,
  customers: Customer[],
): SegmentationSummary | null {
  if (!raw || customers.length === 0) {
    return null;
  }

  try {
    const data: unknown = JSON.parse(raw);

    if (!data || typeof data !== "object") {
      return null;
    }

    const result = data as SegmentationSummary;

    if (
      !Number.isInteger(result.k) ||
      result.k < 2 ||
      result.k > 5 ||
      !Array.isArray(result.grupos) ||
      result.grupos.length !== result.k ||
      result.cantidadProcesada !== customers.length ||
      typeof result.fechaEjecucion !== "string" ||
      !Number.isFinite(Date.parse(result.fechaEjecucion))
    ) {
      return null;
    }

    const identifiers = new Set<number>();
    let totalProcesado = 0;

    for (const group of result.grupos) {
      if (
        !group ||
        !Number.isInteger(group.id) ||
        group.id < 0 ||
        group.id >= result.k ||
        identifiers.has(group.id) ||
        !Number.isInteger(group.cantidad) ||
        group.cantidad <= 0 ||
        !Number.isFinite(group.gastoPromedio) ||
        !Number.isFinite(group.visitasPromedio) ||
        !Number.isFinite(group.antiguedadPromedio) ||
        group.gastoPromedio < 0 ||
        group.visitasPromedio < 0 ||
        group.antiguedadPromedio < 0
      ) {
        return null;
      }

      identifiers.add(group.id);

      const actual = customers.filter(
        (customer) => customer.segmento === group.id,
      ).length;

      if (actual !== group.cantidad) {
        return null;
      }

      totalProcesado += group.cantidad;
    }

    if (totalProcesado !== customers.length) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}
