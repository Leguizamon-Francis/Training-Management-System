import { useEffect, type RefObject } from "react";

function etiquetarTablas(contenedor: HTMLElement) {
  for (const tabla of contenedor.querySelectorAll("table.tabla")) {
    const titulos = [...tabla.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
    for (const fila of tabla.querySelectorAll("tbody tr")) {
      [...fila.children].forEach((celda, i) => {
        const titulo = titulos[i] ?? "";
        if (celda.getAttribute("data-etiqueta") !== titulo) celda.setAttribute("data-etiqueta", titulo);
      });
    }
  }
}

// En el celular cada fila de una tabla se ve como una ficha (ver estilos.css). La celda repite el título
// de su columna en data-etiqueta: así funciona con todas las tablas, también las que cargan después.
export function useEtiquetasTablas(contenedor: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;
    etiquetarTablas(elemento);
    const observador = new MutationObserver(() => etiquetarTablas(elemento));
    observador.observe(elemento, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [contenedor]);
}
