import { useState, type FormEvent } from "react";
import { ErrorApi } from "../api/cliente";
import { pagosApi, type MedioPago, type Pago } from "../api/pagos";
import { formatearFecha, hoyComoTexto } from "../utils/formato";
import { ETIQUETAS_MEDIO, importeParaEditar } from "../utils/pagos";
import Campo from "./Campo";

interface Props {
  pago: Pago;
  onGuardado: () => void;
  onCancelar: () => void;
}

// Corrige un pago ya registrado. El período de la cuota no cambia: las cuotas se encadenan.
export default function FormularioCorregirPago({ pago, onGuardado, onCancelar }: Props) {
  const [fecha, setFecha] = useState(pago.fecha.slice(0, 10));
  const [medio, setMedio] = useState<MedioPago>(pago.medio);
  const [importe, setImporte] = useState(importeParaEditar(pago.importe));
  const [concepto, setConcepto] = useState(pago.concepto);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setErrores({});
    setGuardando(true);
    try {
      await pagosApi.corregir(pago.id, { fecha, importe, medio, concepto });
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo corregir el pago");
      if (err instanceof ErrorApi) setErrores(err.campos);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="formulario-pago" onSubmit={enviar} noValidate>
      <h3>Corregir pago</h3>
      {error && <p className="mensaje-error">{error}</p>}

      <div className="grilla">
        <Campo etiqueta="Fecha de pago" obligatorio errores={errores.fecha}>
          <input type="date" value={fecha} max={hoyComoTexto()} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
        <Campo etiqueta="Medio de pago" obligatorio errores={errores.medio}>
          <select value={medio} onChange={(e) => setMedio(e.target.value as MedioPago)}>
            {Object.entries(ETIQUETAS_MEDIO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </Campo>
        {!pago.cuota && (
          <Campo etiqueta="Concepto" obligatorio errores={errores.concepto}>
            <input value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </Campo>
        )}
        <Campo etiqueta="Importe" obligatorio errores={errores.importe}>
          <input inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} />
        </Campo>
      </div>

      {pago.cuota && (
        <p className="texto-suave">
          La cuota sigue cubriendo del {formatearFecha(pago.cuota.desde)} al {formatearFecha(pago.cuota.vence)}: corregir el pago no cambia ese
          período ni la deuda.
        </p>
      )}

      <div className="acciones">
        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar corrección"}
        </button>
        <button type="button" className="boton-secundario" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
