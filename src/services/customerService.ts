import type {
  Customer,
  CustomerInput,
  CustomerErrors,
} from "../types";

const STORAGE_KEY = "comercial-nova:customers:v1";

const SEGMENTATION_KEY =
  "comercial-nova:segmentation:v1";

export const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: "C001",
    nombre: "Ana Torres",
    gastoAcumulado: 1800,
    visitas6Meses: 12,
    antiguedadMeses: 24,
  },
  {
    id: "C002",
    nombre: "Luis Rojas",
    gastoAcumulado: 2200,
    visitas6Meses: 15,
    antiguedadMeses: 30,
  },
  {
    id: "C003",
    nombre: "Marta Díaz",
    gastoAcumulado: 1600,
    visitas6Meses: 10,
    antiguedadMeses: 18,
  },
  {
    id: "C004",
    nombre: "José Vega",
    gastoAcumulado: 180,
    visitas6Meses: 2,
    antiguedadMeses: 3,
  },
  {
    id: "C005",
    nombre: "Rosa León",
    gastoAcumulado: 250,
    visitas6Meses: 3,
    antiguedadMeses: 5,
  },
  {
    id: "C006",
    nombre: "Pedro Gil",
    gastoAcumulado: 120,
    visitas6Meses: 1,
    antiguedadMeses: 2,
  },
  {
    id: "C007",
    nombre: "Elena Ruiz",
    gastoAcumulado: 850,
    visitas6Meses: 7,
    antiguedadMeses: 12,
  },
  {
    id: "C008",
    nombre: "Marco Soto",
    gastoAcumulado: 720,
    visitas6Meses: 6,
    antiguedadMeses: 10,
  },
  {
    id: "C009",
    nombre: "Sofía Paz",
    gastoAcumulado: 980,
    visitas6Meses: 8,
    antiguedadMeses: 14,
  },
  {
    id: "C010",
    nombre: "Diego Cruz",
    gastoAcumulado: 400,
    visitas6Meses: 4,
    antiguedadMeses: 8,
  },
  {
    id: "C011",
    nombre: "Lucía Rey",
    gastoAcumulado: 520,
    visitas6Meses: 5,
    antiguedadMeses: 9,
  },
  {
    id: "C012",
    nombre: "Raúl Ponce",
    gastoAcumulado: 3000,
    visitas6Meses: 18,
    antiguedadMeses: 36,
  },
];

export const moneyFormatter = new Intl.NumberFormat(
  "es-PE",
  {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  },
);

export function normalizeCustomer(
  input: CustomerInput,
): CustomerInput {
  return {
    id: input.id.trim().toUpperCase(),
    nombre: input.nombre.trim().replace(/\s+/g, " "),
    gastoAcumulado: input.gastoAcumulado,
    visitas6Meses: input.visitas6Meses,
    antiguedadMeses: input.antiguedadMeses,
  };
}

export function validateCustomer(
  input: CustomerInput,
  existing: Customer[],
  originalId?: string,
): CustomerErrors {
  const errors: CustomerErrors = {};

  const normalized = normalizeCustomer(input);

  if (!normalized.id) {
    errors.id = "El código es obligatorio.";
  } else if (normalized.id.length > 20) {
    errors.id = "Máximo 20 caracteres.";
  } else if (
    existing.some(
      (customer) =>
        customer.id.toUpperCase() === normalized.id &&
        customer.id !== originalId,
    )
  ) {
    errors.id = "Este código ya está registrado.";
  }

  if (!normalized.nombre) {
    errors.nombre = "El nombre es obligatorio.";
  } else if (normalized.nombre.length > 100) {
    errors.nombre = "Máximo 100 caracteres.";
  }

  const numericFields: Array<
    keyof Pick<
      CustomerInput,
      "gastoAcumulado" | "visitas6Meses" | "antiguedadMeses"
    >
  > = [
    "gastoAcumulado",
    "visitas6Meses",
    "antiguedadMeses",
  ];

  for (const field of numericFields) {
    const value = normalized[field];

    if (!Number.isFinite(value)) {
      errors[field] = "Introduce un número válido.";
    } else if (value < 0) {
      errors[field] = "No se permiten valores negativos.";
    } else if (
      field !== "gastoAcumulado" &&
      !Number.isInteger(value)
    ) {
      errors[field] = "Debe ser un número entero.";
    }
  }

  return errors;
}

function validateStoredCustomers(
  value: unknown,
): Customer[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Los datos guardados no tienen un formato válido.",
    );
  }

  const customers: Customer[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      throw new Error(
        "Se encontraron registros guardados inválidos.",
      );
    }

    const record = item as Partial<Customer>;

    if (
      typeof record.id !== "string" ||
      typeof record.nombre !== "string" ||
      typeof record.gastoAcumulado !== "number" ||
      typeof record.visitas6Meses !== "number" ||
      typeof record.antiguedadMeses !== "number"
    ) {
      throw new Error(
        "Un registro guardado contiene campos incorrectos.",
      );
    }

    const customer: CustomerInput = {
      id: record.id,
      nombre: record.nombre,
      gastoAcumulado: record.gastoAcumulado,
      visitas6Meses: record.visitas6Meses,
      antiguedadMeses: record.antiguedadMeses,
    };

    const errors = validateCustomer(customer, customers);

    if (Object.keys(errors).length > 0) {
      throw new Error(
        `El cliente ${record.id} contiene datos inválidos.`,
      );
    }

    const normalized = normalizeCustomer(customer);

    if (ids.has(normalized.id)) {
      throw new Error(
        "Existen códigos duplicados en el almacenamiento.",
      );
    }

    ids.add(normalized.id);

    if (
      record.segmento !== undefined &&
      (!Number.isInteger(record.segmento) ||
        record.segmento < 0)
    ) {
      throw new Error(
        "Se encontró una etiqueta de segmento inválida.",
      );
    }

    customers.push({
      ...normalized,
      ...(record.segmento !== undefined
        ? { segmento: record.segmento }
        : {}),
    });
  }

  return customers;
}

export function getCustomers(): Customer[] {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === null) {
    const initialData = SAMPLE_CUSTOMERS.map(
      (customer) => ({ ...customer }),
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(initialData),
    );

    return initialData;
  }

  try {
    return validateStoredCustomers(JSON.parse(stored));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `No se pudieron cargar los clientes: ${error.message}`,
      );
    }

    throw new Error(
      "No se pudieron recuperar los clientes.",
    );
  }
}

function saveCustomers(
  customers: Customer[],
): Customer[] {
  // Al cambiar los datos, cualquier segmentación
  // anterior deja de ser válida.
  const cleaned: Customer[] = customers.map(
    (customer) => ({
      id: customer.id,
      nombre: customer.nombre,
      gastoAcumulado: customer.gastoAcumulado,
      visitas6Meses: customer.visitas6Meses,
      antiguedadMeses: customer.antiguedadMeses,
    }),
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(cleaned),
  );

  localStorage.removeItem(SEGMENTATION_KEY);

  window.dispatchEvent(
    new Event("comercial-nova:customers-updated"),
  );

  return cleaned;
}

export function upsertCustomer(
  input: CustomerInput,
  originalId?: string,
): Customer[] {
  const customers = getCustomers();

  if (
    originalId &&
    !customers.some(
      (customer) => customer.id === originalId,
    )
  ) {
    throw new Error(
      "El cliente que deseas editar ya no existe.",
    );
  }

  const normalized = normalizeCustomer(input);

  const errors = validateCustomer(
    normalized,
    customers,
    originalId,
  );

  if (Object.keys(errors).length > 0) {
    throw new Error(
      Object.values(errors)[0] ??
        "Los datos del cliente son inválidos.",
    );
  }

  if (originalId) {
    return saveCustomers(
      customers.map((customer) =>
        customer.id === originalId
          ? { ...normalized }
          : customer,
      ),
    );
  }

  return saveCustomers([
    ...customers,
    normalized,
  ]);
}

export function deleteCustomer(
  id: string,
): Customer[] {
  const customers = getCustomers();

  if (!customers.some((customer) => customer.id === id)) {
    throw new Error(
      "El cliente que deseas eliminar ya no existe.",
    );
  }

  return saveCustomers(
    customers.filter(
      (customer) => customer.id !== id,
    ),
  );
}
