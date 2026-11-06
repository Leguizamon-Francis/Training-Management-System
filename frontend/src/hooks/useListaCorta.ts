import { useState } from "react";

// Cuántos alumnos se ven en las listas de alumnos antes de "Ver todos".
export const ALUMNOS_POR_LISTA = 25;

// Lista que muestra solo los primeros elementos hasta que se pide verla completa (ver BotonVerTodos).
export function useListaCorta<T>(elementos: T[], cantidadInicial: number) {
  const [abierta, setAbierta] = useState(false);
  return {
    visibles: abierta ? elementos : elementos.slice(0, cantidadInicial),
    ocultos: elementos.length - cantidadInicial,
    abierta,
    alternar: () => setAbierta((valor) => !valor),
  };
}

export type ListaCorta = ReturnType<typeof useListaCorta>;
