import { pedir } from "./cliente";
import type { Plan } from "./planes";

export type MedioPago = "EFECTIVO" | "TRANSFERENCIA";
export type EstadoCuota = "SIN_PAGOS" | "AL_DIA" | "POR_VENCER" | "VENCIDA";

// Los montos llegan como texto ("25000.5") para no perder precisión.
export interface CuotaResumen {
  id: number;
  desde: string; // "aaaa-mm-dd"
  vence: string; // "aaaa-mm-dd"
  importe: string;
  anulada: boolean;
}

// Mes sin pagar (desde → vence).
export interface PeriodoAdeudado {
  desde: string; // "aaaa-mm-dd"
  vence: string; // "aaaa-mm-dd"
}

export interface Situacion {
  estado: EstadoCuota;
  vence: string | null;
  diasRestantes: number | null; // negativo = vencida
  ultimaCuota: CuotaResumen | null;
  inicioProximaCuota: string | null; // dónde empieza la próxima cuota; null = en la fecha de pago
  cuotasAdeudadas: PeriodoAdeudado[]; // meses sin pagar desde el último vencimiento (solo alumnos activos)
  precioCuotaAdeudada: string | null; // precio de cada cuota adeudada; null si el plan no tiene precio
  deudaTotal: string;
}

export interface Pago {
  id: number;
  alumnoId: number;
  cuotaId: number | null; // null = otro concepto
  fecha: string; // ISO
  importe: string;
  concepto: string;
  medio: MedioPago;
  cuota: { desde: string; vence: string } | null;
}

export interface PagosAlumno {
  plan: Plan | null;
  situacion: Situacion;
  pagos: Pago[]; // del más reciente al más viejo
}

export interface EstadoCuotaAlumno {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  plan: string | null;
  activo: boolean; // los inactivos no acumulan deuda
  estado: EstadoCuota;
  vence: string | null;
  diasRestantes: number | null;
  cantidadAdeudadas: number;
  deudaTotal: string;
}

// Pago con los datos del alumno (listas de ingresos).
export type PagoConAlumno = Pago & { alumno: { id: number; nombre: string; apellido: string } };

export interface ReporteIngresos {
  desde: string;
  hasta: string;
  cantidad: number;
  totales: { total: string; efectivo: string; transferencia: string; cuotas: string; otros: string };
  porMes: { mes: string; total: string; efectivo: string; transferencia: string }[]; // mes = "aaaa-mm"
  pagos: PagoConAlumno[];
}

// Dos tipos de pago; "tipo" indica cuáles son los demás campos.
export type DatosPago =
  | { tipo: "CUOTA"; fecha: string; importe: string; medio: MedioPago; cantidad: number } // importe = total de las cuotas
  | { tipo: "OTRO"; fecha: string; importe: string; concepto: string; medio: MedioPago };

export interface CorreccionPago {
  fecha: string;
  importe: string;
  medio: MedioPago;
  concepto: string; // solo se usa en los pagos por otro concepto
}

export const pagosApi = {
  obtener: (alumnoId: number) => pedir<PagosAlumno>(`/alumnos/${alumnoId}/pagos`),

  registrar: (alumnoId: number, datos: DatosPago) =>
    pedir<Pago>(`/alumnos/${alumnoId}/pagos`, { metodo: "POST", datos }),

  corregir: (id: number, datos: CorreccionPago) => pedir<Pago>(`/pagos/${id}`, { metodo: "PUT", datos }),

  eliminar: (id: number) => pedir<void>(`/pagos/${id}`, { metodo: "DELETE" }),

  anularDeuda: (alumnoId: number) => pedir<void>(`/alumnos/${alumnoId}/anular-deuda`, { metodo: "POST" }),

  estadoCuotas: () => pedir<EstadoCuotaAlumno[]>("/pagos/estado-cuotas?incluirInactivos=true"),

  ultimos: (cantidad: number) => pedir<PagoConAlumno[]>(`/pagos/ultimos?cantidad=${cantidad}`),

  ingresos: (desde: string, hasta: string) =>
    pedir<ReporteIngresos>(`/pagos/ingresos?desde=${desde}&hasta=${hasta}`),
};
