import { pedir } from "./cliente";

export type CategoriaPrueba = "FUERZA" | "POTENCIA" | "VELOCIDAD" | "MOVILIDAD" | "RESISTENCIA";

export interface Prueba {
  id: number;
  nombre: string;
  categoria: CategoriaPrueba;
  unidad: string;
  porLado: boolean; // se carga por lado (izquierdo / derecho)
  activa: boolean;
}

export interface DatosPrueba {
  nombre: string;
  categoria: CategoriaPrueba | "";
  unidad: string;
  porLado: boolean; // se carga por lado (izquierdo / derecho)
  activa: boolean;
}

export const pruebasApi = {
  // Las eliminadas solo hacen falta para mostrar evaluaciones viejas que las usaron.
  listar: (incluirInactivas = false, incluirEliminadas = false) =>
    pedir<Prueba[]>(`/pruebas?incluirInactivas=${incluirInactivas}&incluirEliminadas=${incluirEliminadas}`),

  crear: (datos: DatosPrueba) => pedir<Prueba>("/pruebas", { metodo: "POST", datos }),

  actualizar: (id: number, datos: DatosPrueba) => pedir<Prueba>(`/pruebas/${id}`, { metodo: "PUT", datos }),

  eliminar: (id: number) => pedir<void>(`/pruebas/${id}`, { metodo: "DELETE" }),
};
