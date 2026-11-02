import type { ListaCorta } from "../hooks/useListaCorta";

interface Props {
  lista: ListaCorta;
  femenino?: boolean;
  textoCerrar?: string; // en listas que no están ordenadas por fecha
}

// "Ver todas (3 más)" / "Ver solo las últimas". No se muestra si no hay nada oculto.
export default function BotonVerTodos({ lista, femenino = false, textoCerrar }: Props) {
  if (lista.ocultos <= 0) return null;
  const [todos, ultimos] = femenino ? ["todas", "las últimas"] : ["todos", "los últimos"];
  return (
    <button type="button" className="boton-secundario boton-desplegar" onClick={lista.alternar}>
      {lista.abierta ? (textoCerrar ?? `Ver solo ${ultimos}`) : `Ver ${todos} (${lista.ocultos} más)`}
    </button>
  );
}
