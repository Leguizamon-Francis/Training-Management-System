import { pedir } from "./cliente";

export type Modalidad = "PRESENCIAL" | "SEMIPRESENCIAL" | "ONLINE" | "OTRO";

// Las 4 membresías iniciales tienen modalidad; las que agrega el gimnasio, null.
export interface Plan {
  id: number;
  nombre: string;
  modalidad: Modalidad | null;
  precioMensual: string; // Decimal como texto, ej.: "25000"; "0" = precio sin definir
  eliminable: boolean; // agregada por el gimnasio y sin alumnos ni cuotas
}

export const planesApi = {
  listar: () => pedir<Plan[]>("/planes"),

  // precioMensual acepta "25.000" o "25.000,50"
  crear: (nombre: string, precioMensual: string) =>
    pedir<Plan>("/planes", { metodo: "POST", datos: { nombre, precioMensual } }),

  actualizarPrecio: (id: number, precioMensual: string) =>
    pedir<Plan>(`/planes/${id}`, { metodo: "PUT", datos: { precioMensual } }),

  cambiarNombre: (id: number, nombre: string) =>
    pedir<Plan>(`/planes/${id}/nombre`, { metodo: "PATCH", datos: { nombre } }),

  eliminar: (id: number) => pedir<void>(`/planes/${id}`, { metodo: "DELETE" }),
};
