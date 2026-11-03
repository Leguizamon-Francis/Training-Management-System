import type { ReactNode } from "react";

interface Props {
  etiqueta: string;
  children: ReactNode; // el <input>, <select> o <textarea>
  ayuda?: string;
  errores?: string[];
  obligatorio?: boolean;
}

export default function Campo({ etiqueta, children, ayuda, errores, obligatorio }: Props) {
  return (
    <label className="campo">
      <span>
        {etiqueta}
        {obligatorio && <span className="obligatorio"> *</span>}
      </span>
      {children}
      {ayuda && <small className="ayuda">{ayuda}</small>}
      {errores?.map((mensaje) => (
        <small key={mensaje} className="error-campo">
          {mensaje}
        </small>
      ))}
    </label>
  );
}
