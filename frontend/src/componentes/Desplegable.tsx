import type { ReactNode } from "react";

interface Props {
  titulo: string;
  children: ReactNode;
}

// Con <details> nativo: sin estado propio y accesible con teclado.
export default function Desplegable({ titulo, children }: Props) {
  return (
    <details className="tarjeta seccion desplegable">
      <summary>
        <h2>{titulo}</h2>
      </summary>
      <div className="desplegable-contenido">{children}</div>
    </details>
  );
}
