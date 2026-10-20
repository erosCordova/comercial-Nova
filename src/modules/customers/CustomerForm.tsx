import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { FormEvent } from "react";

import {
  CircleAlert,
  UserRoundPlus,
  X,
} from "lucide-react";

import type {
  Customer,
  CustomerInput,
  CustomerErrors,
} from "../../types";

import {
  validateCustomer,
} from "../../services/customerService";

interface Props {
  customer: Customer | null;
  customers: Customer[];
  onClose: () => void;
  onSave: (
    input: CustomerInput,
    originalId?: string,
  ) => void;
}

type FormField = keyof CustomerInput;

type FormValues = Record<FormField, string>;

function initialValues(
  customer: Customer | null,
): FormValues {
  return {
    id: customer?.id ?? "",
    nombre: customer?.nombre ?? "",
    gastoAcumulado:
      customer?.gastoAcumulado.toString() ?? "",
    visitas6Meses:
      customer?.visitas6Meses.toString() ?? "",
    antiguedadMeses:
      customer?.antiguedadMeses.toString() ?? "",
  };
}

export default function CustomerForm({
  customer,
  customers,
  onClose,
  onSave,
}: Props) {
  const [values, setValues] = useState<FormValues>(
    () => initialValues(customer),
  );

  const [errors, setErrors] = useState<CustomerErrors>({});
  const [generalError, setGeneralError] = useState("");

  const firstInput = useRef<HTMLInputElement>(null);

  const editing = customer !== null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    firstInput.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  function updateField(
    field: FormField,
    value: string,
  ) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setGeneralError("");
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const input: CustomerInput = {
      id: values.id.trim().toUpperCase(),
      nombre: values.nombre.trim(),
      gastoAcumulado: Number(values.gastoAcumulado),
      visitas6Meses: Number(values.visitas6Meses),
      antiguedadMeses: Number(values.antiguedadMeses),
    };

    const nextErrors = validateCustomer(
      input,
      customers,
      customer?.id,
    );

    const requiredFields: FormField[] = [
      "id",
      "nombre",
      "gastoAcumulado",
      "visitas6Meses",
      "antiguedadMeses",
    ];

    for (const field of requiredFields) {
      if (!values[field].trim()) {
        nextErrors[field] = "Este campo es obligatorio.";
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setGeneralError(
        "Revisa los campos señalados antes de guardar.",
      );
      return;
    }

    try {
      onSave(input, customer?.id);
    } catch (error) {
      setGeneralError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el cliente.",
      );
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="modal-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-dialog-title"
      >
        <div className="modal-header">
          <div className="modal-heading">
            <div className="modal-heading-icon">
              <UserRoundPlus size={23} />
            </div>

            <div>
              <h2 id="customer-dialog-title">
                {editing
                  ? "Editar cliente"
                  : "Registrar cliente"}
              </h2>

              <p>
                Completa la información comercial.
              </p>
            </div>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {generalError && (
              <div className="form-error-banner" role="alert">
                <CircleAlert size={17} />
                <span>{generalError}</span>
              </div>
            )}

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="customer-id">
                  Código del cliente *
                </label>

                <input
                  ref={firstInput}
                  id="customer-id"
                  value={values.id}
                  maxLength={20}
                  placeholder="Ej. C013"
                  aria-invalid={!!errors.id}
                  onChange={(event) =>
                    updateField("id", event.target.value)
                  }
                />

                {errors.id && (
                  <small className="field-error">
                    {errors.id}
                  </small>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="customer-name">
                  Nombre completo *
                </label>

                <input
                  id="customer-name"
                  value={values.nombre}
                  maxLength={100}
                  placeholder="Ej. Carmen López"
                  aria-invalid={!!errors.nombre}
                  onChange={(event) =>
                    updateField(
                      "nombre",
                      event.target.value,
                    )
                  }
                />

                {errors.nombre && (
                  <small className="field-error">
                    {errors.nombre}
                  </small>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="customer-spending">
                  Gasto acumulado (S/) *
                </label>

                <input
                  id="customer-spending"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.gastoAcumulado}
                  placeholder="0.00"
                  aria-invalid={!!errors.gastoAcumulado}
                  onChange={(event) =>
                    updateField(
                      "gastoAcumulado",
                      event.target.value,
                    )
                  }
                />

                {errors.gastoAcumulado && (
                  <small className="field-error">
                    {errors.gastoAcumulado}
                  </small>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="customer-visits">
                  Visitas en 6 meses *
                </label>

                <input
                  id="customer-visits"
                  type="number"
                  min="0"
                  step="1"
                  value={values.visitas6Meses}
                  placeholder="0"
                  aria-invalid={!!errors.visitas6Meses}
                  onChange={(event) =>
                    updateField(
                      "visitas6Meses",
                      event.target.value,
                    )
                  }
                />

                {errors.visitas6Meses && (
                  <small className="field-error">
                    {errors.visitas6Meses}
                  </small>
                )}
              </div>

              <div className="form-field full-width">
                <label htmlFor="customer-months">
                  Antigüedad del cliente (meses) *
                </label>

                <input
                  id="customer-months"
                  type="number"
                  min="0"
                  step="1"
                  value={values.antiguedadMeses}
                  placeholder="0"
                  aria-invalid={!!errors.antiguedadMeses}
                  onChange={(event) =>
                    updateField(
                      "antiguedadMeses",
                      event.target.value,
                    )
                  }
                />

                {errors.antiguedadMeses && (
                  <small className="field-error">
                    {errors.antiguedadMeses}
                  </small>
                )}
              </div>
            </div>

            <div className="form-information">
              Los datos de gasto, visitas y antigüedad
              serán utilizados posteriormente por K-Means.
              Los valores negativos no están permitidos.
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="button button-primary"
            >
              {editing
                ? "Guardar cambios"
                : "Registrar cliente"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
