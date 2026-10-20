import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Database,
  Plus,
  Search,
  Trash2,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";

import type {
  Customer,
  CustomerInput,
} from "../../types";

import {
  deleteCustomer,
  getCustomers,
  moneyFormatter,
  upsertCustomer,
} from "../../services/customerService";

import CustomerForm from "./CustomerForm";
import CustomerTable from "./CustomerTable";

const PAGE_SIZE = 10;

type SortOption =
  | "code"
  | "name"
  | "spending-desc"
  | "spending-asc"
  | "visits-desc"
  | "visits-asc";

interface Notice {
  type: "success" | "error";
  message: string;
}

function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("code");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<Customer | null>(null);

  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    try {
      const storedCustomers = getCustomers();
      setCustomers(storedCustomers);
      setLoadError("");
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No fue posible cargar los registros.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, sort, customers.length]);

  const filteredCustomers = useMemo(() => {
    const query = normalizeSearch(search.trim());

    const matching = customers.filter((customer) => {
      return (
        normalizeSearch(customer.nombre).includes(query) ||
        normalizeSearch(customer.id).includes(query)
      );
    });

    return [...matching].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.nombre.localeCompare(b.nombre, "es");
        case "spending-desc":
          return b.gastoAcumulado - a.gastoAcumulado;
        case "spending-asc":
          return a.gastoAcumulado - b.gastoAcumulado;
        case "visits-desc":
          return b.visitas6Meses - a.visitas6Meses;
        case "visits-asc":
          return a.visitas6Meses - b.visitas6Meses;
        default:
          return a.id.localeCompare(b.id, "es");
      }
    });
  }, [customers, search, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / PAGE_SIZE),
  );

  const safePage = Math.min(page, totalPages);

  const visibleCustomers = filteredCustomers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const totalSpending = customers.reduce(
    (sum, customer) =>
      sum + customer.gastoAcumulado,
    0,
  );

  const averageSpending =
    customers.length > 0
      ? totalSpending / customers.length
      : 0;

  const averageVisits =
    customers.length > 0
      ? customers.reduce(
          (sum, customer) =>
            sum + customer.visitas6Meses,
          0,
        ) / customers.length
      : 0;

  function openCreate() {
    setEditingCustomer(null);
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  function saveCustomer(
    input: CustomerInput,
    originalId?: string,
  ) {
    const updated = upsertCustomer(input, originalId);

    setCustomers(updated);
    setFormOpen(false);
    setEditingCustomer(null);

    setNotice({
      type: "success",
      message: originalId
        ? "Los datos del cliente se actualizaron correctamente."
        : "El nuevo cliente se registró correctamente.",
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;

    try {
      const updated = deleteCustomer(deleteTarget.id);

      setCustomers(updated);

      setNotice({
        type: "success",
        message: `Se eliminó correctamente a ${deleteTarget.nombre}.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el cliente.",
      });
    } finally {
      setDeleteTarget(null);
    }
  }

  useEffect(() => {
    if (!deleteTarget) return;

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDeleteTarget(null);
      }
    }

    window.addEventListener("keydown", onEscape);

    return () =>
      window.removeEventListener("keydown", onEscape);
  }, [deleteTarget]);

  if (loading) {
    return (
      <div className="surface-card centered-state">
        Cargando clientes...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="surface-card centered-state">
        <AlertCircle size={34} color="#dc5668" />

        <h2>No se pudieron recuperar los datos</h2>

        <p>{loadError}</p>

        <p>
          No se sobrescribirá el almacenamiento
          para evitar perder información.
        </p>
      </div>
    );
  }

  return (
    <div className="customers-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            BASE DE DATOS COMERCIAL
          </span>

          <h2>Gestión de clientes</h2>

          <p>
            Administra la información utilizada para
            identificar patrones de comportamiento.
          </p>
        </div>

        <button
          type="button"
          className="button button-primary"
          onClick={openCreate}
        >
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>

      <div className="customer-stats">
        <div className="customer-stat-card">
          <div className="stat-icon stat-blue">
            <UsersRound size={22} />
          </div>

          <div>
            <span>Total de clientes</span>
            <strong>{customers.length}</strong>
            <small>Registros disponibles</small>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="stat-icon stat-cyan">
            <Wallet size={22} />
          </div>

          <div>
            <span>Gasto promedio</span>
            <strong>
              {moneyFormatter.format(averageSpending)}
            </strong>
            <small>Por cliente registrado</small>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="stat-icon stat-purple">
            <ArrowDownUp size={22} />
          </div>

          <div>
            <span>Visitas promedio</span>
            <strong>
              {averageVisits.toFixed(2)}
            </strong>
            <small>Durante 6 meses</small>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={
            "notice " +
            (notice.type === "success"
              ? "notice-success"
              : "notice-error")
          }
          role="status"
        >
          <span>{notice.message}</span>

          <button
            type="button"
            className="icon-button"
            onClick={() => setNotice(null)}
            aria-label="Cerrar notificación"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section className="surface-card customer-list-card">
        <div className="list-heading">
          <div>
            <h3>Directorio de clientes</h3>

            <p>
              Consulta, busca y administra los registros.
            </p>
          </div>

          <span className="records-badge">
            <Database size={15} />
            {customers.length} registros
          </span>
        </div>

        <div className="customer-toolbar">
          <label className="search-box">
            <Search size={19} />

            <input
              type="search"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <label className="sort-box">
            <ArrowDownUp size={17} />

            <select
              value={sort}
              aria-label="Ordenar clientes"
              onChange={(event) =>
                setSort(
                  event.target.value as SortOption,
                )
              }
            >
              <option value="code">
                Ordenar por código
              </option>

              <option value="name">
                Ordenar por nombre
              </option>

              <option value="spending-desc">
                Mayor gasto
              </option>

              <option value="spending-asc">
                Menor gasto
              </option>

              <option value="visits-desc">
                Más visitas
              </option>

              <option value="visits-asc">
                Menos visitas
              </option>
            </select>
          </label>
        </div>

        <CustomerTable
          customers={visibleCustomers}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />

        <div className="table-footer">
          <span>
            {filteredCustomers.length === 0
              ? "Sin registros para mostrar"
              : `Mostrando ${
                  (safePage - 1) * PAGE_SIZE + 1
                }–${Math.min(
                  safePage * PAGE_SIZE,
                  filteredCustomers.length,
                )} de ${filteredCustomers.length} clientes`}
          </span>

          <div className="pagination">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={safePage <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1),
                )
              }
            >
              <ChevronLeft size={18} />
            </button>

            <span>
              {safePage} / {totalPages}
            </span>

            <button
              type="button"
              aria-label="Página siguiente"
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1),
                )
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <p className="page-footnote">
        Los registros iniciales son datos ficticios
        proporcionados para la práctica de laboratorio.
      </p>

      {formOpen && (
        <CustomerForm
          key={editingCustomer?.id ?? "new"}
          customer={editingCustomer}
          customers={customers}
          onClose={() => setFormOpen(false)}
          onSave={saveCustomer}
        />
      )}

      {deleteTarget && (
        <div className="modal-backdrop">
          <section
            className="modal-window modal-small"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
          >
            <div className="delete-dialog-content">
              <div className="delete-icon">
                <Trash2 size={26} />
              </div>

              <h2 id="delete-dialog-title">
                ¿Eliminar cliente?
              </h2>

              <p id="delete-dialog-description">
                Estás a punto de eliminar a{" "}
                <strong>{deleteTarget.nombre}</strong>{" "}
                ({deleteTarget.id}).
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="button button-danger"
                onClick={confirmDelete}
              >
                <Trash2 size={17} />
                Eliminar cliente
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
