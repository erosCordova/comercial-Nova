import {
  Pencil,
  Trash2,
  UsersRound,
} from "lucide-react";

import type { Customer } from "../../types";

import {
  moneyFormatter,
} from "../../services/customerService";

interface Props {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

const avatarColors = [
  "avatar-blue",
  "avatar-purple",
  "avatar-cyan",
  "avatar-orange",
  "avatar-green",
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarColor(id: string) {
  const number = [...id].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );

  return avatarColors[number % avatarColors.length];
}

export default function CustomerTable({
  customers,
  onEdit,
  onDelete,
}: Props) {
  if (customers.length === 0) {
    return (
      <div className="table-empty">
        <div className="empty-icon">
          <UsersRound size={27} />
        </div>
        <strong>No se encontraron clientes</strong>
        <p>
          Prueba con otra búsqueda o registra
          un nuevo cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="customers-table">
        <thead>
          <tr>
            <th scope="col">CLIENTE</th>
            <th scope="col">CÓDIGO</th>
            <th scope="col">GASTO ACUMULADO</th>
            <th scope="col">VISITAS / 6 MESES</th>
            <th scope="col">ANTIGÜEDAD</th>
            <th scope="col">SEGMENTO</th>
            <th scope="col" className="actions-heading">
              ACCIONES
            </th>
          </tr>
        </thead>

        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <div className="customer-identity">
                  <div
                    className={
                      "customer-avatar " +
                      getAvatarColor(customer.id)
                    }
                    aria-hidden="true"
                  >
                    {getInitials(customer.nombre)}
                  </div>

                  <span className="customer-name">
                    {customer.nombre}
                  </span>
                </div>
              </td>

              <td>
                <span className="customer-code">
                  {customer.id}
                </span>
              </td>

              <td>
                <strong className="money-cell">
                  {moneyFormatter.format(
                    customer.gastoAcumulado,
                  )}
                </strong>
              </td>

              <td>
                <span className="numeric-cell">
                  {customer.visitas6Meses}
                </span>
              </td>

              <td>
                <span className="numeric-cell">
                  {customer.antiguedadMeses} meses
                </span>
              </td>

              <td>
                {customer.segmento === undefined ? (
                  <span className="segment-unassigned">
                    Sin segmentar
                  </span>
                ) : (
                  <span className="segment-assigned">
                    Grupo {customer.segmento}
                  </span>
                )}
              </td>

              <td>
                <div className="table-actions">
                  <button
                    className="table-action edit-action"
                    type="button"
                    title={`Editar ${customer.nombre}`}
                    aria-label={`Editar ${customer.nombre}`}
                    onClick={() => onEdit(customer)}
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    className="table-action delete-action"
                    type="button"
                    title={`Eliminar ${customer.nombre}`}
                    aria-label={`Eliminar ${customer.nombre}`}
                    onClick={() => onDelete(customer)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
