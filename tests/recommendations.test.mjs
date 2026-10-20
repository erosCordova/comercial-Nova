import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCommercialRecommendations,
} from "../src/services/recommendationsService.ts";

const customers = [
  {
    id: "C001",
    nombre: "Cliente uno",
    gastoAcumulado: 200,
    visitas6Meses: 2,
    antiguedadMeses: 3,
    segmento: 0,
  },
  {
    id: "C002",
    nombre: "Cliente dos",
    gastoAcumulado: 400,
    visitas6Meses: 4,
    antiguedadMeses: 5,
    segmento: 0,
  },
  {
    id: "C003",
    nombre: "Cliente tres",
    gastoAcumulado: 1800,
    visitas6Meses: 14,
    antiguedadMeses: 24,
    segmento: 1,
  },
  {
    id: "C004",
    nombre: "Cliente cuatro",
    gastoAcumulado: 2200,
    visitas6Meses: 18,
    antiguedadMeses: 30,
    segmento: 1,
  },
];

const summary = {
  k: 2,
  cantidadProcesada: 4,
  fechaEjecucion: "2026-10-20T12:00:00Z",
  grupos: [
    {
      id: 0,
      cantidad: 2,
      gastoPromedio: 300,
      visitasPromedio: 3,
      antiguedadPromedio: 4,
    },
    {
      id: 1,
      cantidad: 2,
      gastoPromedio: 2000,
      visitasPromedio: 16,
      antiguedadPromedio: 27,
    },
  ],
};

test("Genera dos recomendaciones", () => {
  assert.equal(
    buildCommercialRecommendations(
      customers,
      summary,
    ).length,
    2,
  );
});

test("Calcula la participación de cada grupo", () => {
  const result = buildCommercialRecommendations(
    customers,
    summary,
  );

  assert.equal(result[0].participacion, 50);
  assert.equal(result[1].participacion, 50);
});

test("Reconoce grupos de mayor gasto", () => {
  const result = buildCommercialRecommendations(
    customers,
    summary,
  );

  const group = result.find(
    (item) => item.segmento === 1,
  );

  assert.equal(group.nivelGasto, "superior");
  assert.equal(group.nivelVisitas, "superior");
});

test("Recomienda fidelización correctamente", () => {
  const result = buildCommercialRecommendations(
    customers,
    summary,
  );

  const group = result.find(
    (item) => item.segmento === 1,
  );

  assert.match(
    group.estrategia,
    /fidelización/,
  );
});

test("Recomienda reactivación si corresponde", () => {
  const result = buildCommercialRecommendations(
    customers,
    summary,
  );

  const group = result.find(
    (item) => item.segmento === 0,
  );

  assert.match(
    group.estrategia,
    /reactivación/,
  );
});

test("La estrategia no depende del número de grupo", () => {
  const swappedCustomers = customers.map(
    (customer) => ({
      ...customer,
      segmento:
        customer.segmento === 0 ? 1 : 0,
    }),
  );

  const swappedSummary = {
    ...summary,
    grupos: summary.grupos.map(
      (group) => ({
        ...group,
        id: group.id === 0 ? 1 : 0,
      }),
    ),
  };

  const result = buildCommercialRecommendations(
    swappedCustomers,
    swappedSummary,
  );

  const highGroup = result.find(
    (item) => item.segmento === 0,
  );

  assert.equal(
    highGroup.nivelGasto,
    "superior",
  );
});

test("Cada estrategia incluye tres acciones", () => {
  const result = buildCommercialRecommendations(
    customers,
    summary,
  );

  for (const item of result) {
    assert.equal(item.acciones.length, 3);
    assert.ok(item.indicador.length > 10);
  }
});

test("No recomienda sin segmentación", () => {
  assert.deepEqual(
    buildCommercialRecommendations(
      customers,
      null,
    ),
    [],
  );
});

test("Rechaza cantidades inconsistentes", () => {
  const invalid = {
    ...summary,
    grupos: [
      {
        ...summary.grupos[0],
        cantidad: 3,
      },
      summary.grupos[1],
    ],
  };

  assert.deepEqual(
    buildCommercialRecommendations(
      customers,
      invalid,
    ),
    [],
  );
});

test("Rechaza promedios alterados", () => {
  const invalid = {
    ...summary,
    grupos: [
      {
        ...summary.grupos[0],
        gastoPromedio: 9999,
      },
      summary.grupos[1],
    ],
  };

  assert.deepEqual(
    buildCommercialRecommendations(
      customers,
      invalid,
    ),
    [],
  );
});

test("Controla conjuntos vacíos", () => {
  assert.deepEqual(
    buildCommercialRecommendations(
      [],
      summary,
    ),
    [],
  );
});

test("Rechaza asignaciones incompletas", () => {
  const incomplete = customers.map(
    (customer) => ({
      ...customer,
      segmento:
        customer.id === "C001"
          ? undefined
          : customer.segmento,
    }),
  );

  assert.deepEqual(
    buildCommercialRecommendations(
      incomplete,
      summary,
    ),
    [],
  );
});

test("Simula campaña con valores verificables", async () => {
  const { simulateCampaign } = await import(
    "../src/services/recommendationsService.ts"
  );

  const result = simulateCampaign({
    audiencia: 10,
    cobertura: 80,
    respuesta: 25,
    ticket: 100,
    margen: 40,
    costoContacto: 5,
    costoFijo: 10,
  });

  assert.equal(result.contactosEsperados, 8);
  assert.equal(result.comprasEsperadas, 2);
  assert.equal(result.ingresosHipoteticos, 200);
  assert.equal(result.margenHipotetico, 80);
  assert.equal(result.costoTotal, 50);
  assert.equal(result.resultadoNeto, 30);
  assert.equal(result.roi, 60);
});

test("Rechaza porcentajes mayores que 100", async () => {
  const { simulateCampaign } = await import(
    "../src/services/recommendationsService.ts"
  );

  assert.throws(() => simulateCampaign({
    audiencia: 10,
    cobertura: 150,
    respuesta: 20,
    ticket: 100,
    margen: 30,
    costoContacto: 1,
    costoFijo: 0,
  }));
});

test("Controla simulación sin costos", async () => {
  const { simulateCampaign } = await import(
    "../src/services/recommendationsService.ts"
  );

  const result = simulateCampaign({
    audiencia: 0,
    cobertura: 100,
    respuesta: 20,
    ticket: 100,
    margen: 30,
    costoContacto: 0,
    costoFijo: 0,
  });

  assert.equal(result.resultadoNeto, 0);
  assert.equal(result.roi, null);
});

test("Genera seis tareas en tres etapas", async () => {
  const {
    buildCampaignSteps,
    buildCommercialRecommendations,
  } = await import(
    "../src/services/recommendationsService.ts"
  );

  const rec = buildCommercialRecommendations(
    customers,
    summary,
  )[0];

  const steps = buildCampaignSteps(rec);

  assert.equal(steps.length, 6);

  assert.deepEqual(
    [...new Set(steps.map((step) => step.etapa))],
    [
      "Preparación",
      "Prueba comercial",
      "Evaluación",
    ],
  );
});
