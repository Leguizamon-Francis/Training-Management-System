import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

// Pide datos a la API al mostrar el componente y cada vez que cambian las dependencias.
// datos es null mientras carga; recargar() los vuelve a pedir (ej.: después de guardar un cambio).
export function useCarga<T>(pedir: () => Promise<T>, dependencias: DependencyList) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState("");
  // Solo vale la respuesta del último pedido: si se cambia un filtro rápido (ej.: el mes),
  // una respuesta vieja que llega tarde no pisa a la nueva.
  const ultimoPedido = useRef(0);

  const recargar = useCallback(async () => {
    const numero = ++ultimoPedido.current;
    try {
      const resultado = await pedir();
      if (numero !== ultimoPedido.current) return;
      setDatos(resultado);
      setError("");
    } catch (err) {
      if (numero !== ultimoPedido.current) return;
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos");
    }
  }, dependencias);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { datos, error, setError, recargar };
}
