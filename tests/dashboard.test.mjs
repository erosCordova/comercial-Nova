import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDashboardMetrics,
  validateSegmentationSummary,
} from "../src/services/dashboardMetrics.ts";

const customers = [
  ["C001", 1800, 12, 24],
  ["C002", 2200, 15, 30],
  ["C003", 1600, 10, 18],
  ["C004", 180, 2, 3],
  ["C005", 250, 3, 5],
  ["C006", 120, 1, 2],
  ["C007", 850, 7, 12],
  ["C008", 720, 6, 10],
  ["C009", 980, 8, 14],
  ["C010", 400, 4, 8],
  ["C011", 520, 5, 9],
  ["C012", 3000, 18, 36],
].map(([id, spending, visits, months]) => ({
  id,
  nombre: String(id),
  gastoAcumulado: spending,
  visitas6Meses: visits,
  antiguedadMeses: months,
}));

test("Calcula 12 clientes originales", () => {
  const result = calculateDashboardMetrics(customers, null);
  assert.equal(result.totalClientes, 12);
});

test("Calcula gasto promedio correcto", () => {
  const result = calculateDashboardMetrics(customers, null);
  assert.ok(Math.abs(result.gastoPromedio - 1051.6666667) < 0.001);
});

test("Calcula visitas promedio correcto", () => {
  const result = calculateDashboardMetrics(customers, null);
  assert.ok(Math.abs(result.visitasPromedio - 7.5833333) < 0.001);
});

test("No inventa grupos antes de ejecutar K-Means", () => {
  const result = calculateDashboardMetrics(customers, null);
  assert.equal(result.segmentosDetectados, 0);
});

test("Los indicadores cambian al añadir clientes", () => {
  const extra = {
    id: "C013",
    nombre: "Cliente nuevo",
    gastoAcumulado: 600,
    visitas6Meses: 5,
    antiguedadMeses: 8,
  };

  const result = calculateDashboardMetrics(
    [...customers, extra],
    null,
  );

  assert.equal(result.totalClientes, 13);
  assert.equal(result.gastoPromedio, 13220 / 13);
});

test("Controla correctamente un conjunto vacío", () => {
  const result = calculateDashboardMetrics([], null);

  assert.equal(result.totalClientes, 0);
  assert.equal(result.gastoPromedio, 0);
  assert.equal(result.visitasPromedio, 0);
  assert.equal(result.segmentosDetectados, 0);
});

test("Rechaza una segmentación inconsistente", () => {
  const invalid = JSON.stringify({
    k: 3,
    fechaEjecucion: new Date().toISOString(),
    cantidadProcesada: 12,
    grupos: [],
  });

  assert.equal(
    validateSegmentationSummary(invalid, customers),
    null,
  );
});

test("Rechaza JSON de segmentación dañado", () => {
  assert.equal(
    validateSegmentationSummary("{invalido", customers),
    null,
  );
});
