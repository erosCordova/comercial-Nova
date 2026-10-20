export interface Customer {
  id: string;
  nombre: string;
  gastoAcumulado: number;
  visitas6Meses: number;
  antiguedadMeses: number;
  segmento?: number;
}

export type CustomerInput = Omit<Customer, "segmento">;

export type CustomerErrors = Partial<
  Record<keyof CustomerInput, string>
>;

export interface SegmentGroup {
  id: number;
  cantidad: number;
  gastoPromedio: number;
  visitasPromedio: number;
  antiguedadPromedio: number;
}

export interface SegmentationSummary {
  tiempoEjecucionMs?: number;
  inercia?: number;
  iteraciones?: number;
  k: number;
  fechaEjecucion: string;
  cantidadProcesada: number;
  grupos: SegmentGroup[];
}
