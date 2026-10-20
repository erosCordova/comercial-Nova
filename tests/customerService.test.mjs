import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

const storage = new Map();

globalThis.localStorage = {
  getItem(key) {
    return storage.has(key)
      ? storage.get(key)
      : null;
  },

  setItem(key, value) {
    storage.set(key, String(value));
  },

  removeItem(key) {
    storage.delete(key);
  },

  clear() {
    storage.clear();
  },
};

globalThis.window = new EventTarget();

const {
  SAMPLE_CUSTOMERS,
  getCustomers,
  upsertCustomer,
  deleteCustomer,
  validateCustomer,
} = await import(
  "../src/services/customerService.ts"
);

beforeEach(() => {
  storage.clear();
});

test("Carga los 12 clientes del documento", () => {
  const customers = getCustomers();

  assert.equal(customers.length, 12);
  assert.equal(customers[0].id, "C001");
  assert.equal(customers[11].id, "C012");
  assert.equal(customers[11].gastoAcumulado, 3000);

  assert.deepEqual(
    customers,
    SAMPLE_CUSTOMERS,
  );
});

test("Registra un cliente válido", () => {
  getCustomers();

  const updated = upsertCustomer({
    id: "C013",
    nombre: "Carmen López",
    gastoAcumulado: 900,
    visitas6Meses: 7,
    antiguedadMeses: 11,
  });

  assert.equal(updated.length, 13);

  assert.ok(
    updated.some(
      (customer) => customer.id === "C013",
    ),
  );
});

test("Rechaza códigos duplicados", () => {
  getCustomers();

  assert.throws(
    () =>
      upsertCustomer({
        id: "c001",
        nombre: "Cliente duplicado",
        gastoAcumulado: 400,
        visitas6Meses: 2,
        antiguedadMeses: 6,
      }),
    /código ya está registrado/,
  );
});

test("Rechaza números negativos", () => {
  const errors = validateCustomer(
    {
      id: "C013",
      nombre: "Cliente de prueba",
      gastoAcumulado: -100,
      visitas6Meses: 4,
      antiguedadMeses: 8,
    },
    getCustomers(),
  );

  assert.ok(errors.gastoAcumulado);
});

test("Rechaza visitas no enteras", () => {
  const errors = validateCustomer(
    {
      id: "C013",
      nombre: "Cliente de prueba",
      gastoAcumulado: 500,
      visitas6Meses: 2.5,
      antiguedadMeses: 8,
    },
    getCustomers(),
  );

  assert.ok(errors.visitas6Meses);
});

test("Edita las visitas de un cliente", () => {
  const customers = getCustomers();

  const original = customers.find(
    (customer) => customer.id === "C001",
  );

  assert.ok(original);

  const updated = upsertCustomer(
    {
      id: original.id,
      nombre: original.nombre,
      gastoAcumulado: original.gastoAcumulado,
      visitas6Meses: 20,
      antiguedadMeses: original.antiguedadMeses,
    },
    "C001",
  );

  const edited = updated.find(
    (customer) => customer.id === "C001",
  );

  assert.equal(edited?.visitas6Meses, 20);
  assert.equal(updated.length, 12);
});

test("Elimina únicamente el cliente solicitado", () => {
  getCustomers();

  const updated = deleteCustomer("C004");

  assert.equal(updated.length, 11);

  assert.ok(
    !updated.some(
      (customer) => customer.id === "C004",
    ),
  );

  assert.ok(
    updated.some(
      (customer) => customer.id === "C001",
    ),
  );
});

test("Conserva los cambios en almacenamiento", () => {
  getCustomers();

  upsertCustomer({
    id: "C013",
    nombre: "Cliente persistente",
    gastoAcumulado: 600,
    visitas6Meses: 5,
    antiguedadMeses: 10,
  });

  const reloaded = getCustomers();

  assert.equal(reloaded.length, 13);

  assert.ok(
    reloaded.some(
      (customer) => customer.id === "C013",
    ),
  );
});

test("No sobrescribe datos almacenados corruptos", () => {
  storage.set(
    "comercial-nova:customers:v1",
    "{datos-invalidos",
  );

  assert.throws(
    () => getCustomers(),
    /No se pudieron cargar los clientes/,
  );

  assert.equal(
    storage.get("comercial-nova:customers:v1"),
    "{datos-invalidos",
  );
});

test("Invalida la segmentación después de editar", () => {
  getCustomers();

  storage.set(
    "comercial-nova:segmentation:v1",
    '{"k":3}',
  );

  const customer = getCustomers()[0];

  upsertCustomer(
    {
      id: customer.id,
      nombre: customer.nombre,
      gastoAcumulado: 2000,
      visitas6Meses: customer.visitas6Meses,
      antiguedadMeses: customer.antiguedadMeses,
    },
    customer.id,
  );

  assert.equal(
    storage.has("comercial-nova:segmentation:v1"),
    false,
  );
});
