import { useState, type FormEvent } from "react";
import { ErrorApi } from "../api/cliente";
import { pagosApi, type DatosPago, type MedioPago } from "../api/pagos";
import type { Plan } from "../api/planes";
import { formatearFecha, hoyComoTexto, sumarMeses } from "../utils/formato";
import { ETIQUETAS_MEDIO, importeParaEditar, textoPrecioPlan } from "../utils/pagos";
import Campo from "./Campo";

type TipoPago = DatosPago["tipo"];

interface Props {
  alumnoId: number;
  plan: Plan | null;
  inicioCuota: string | null; // dónde empieza la cuota que se paga; null = en la fecha de pago
  cantidadAdeudadas: number;
  onGuardado: () => void;
  onCancelar: () => void;
}

// Registro de un pago: cuota mensual (se paga completa) u otro concepto.
export default function FormularioPago({ alumnoId, plan, inicioCuota, cantidadAdeudadas, onGuardado, onCancelar }: Props) {
  // Si el plan todavía no tiene precio (0), el importe queda vacío para completarlo a mano.
  const precioPlan = plan && Number(plan.precioMensual) > 0 ? importeParaEditar(plan.precioMensual) : "";
  const [tipo, setTipo] = useState<TipoPago>("CUOTA");
  const [fecha, setFecha] = useState(hoyComoTexto());
  const [medio, setMedio] = useState<MedioPago>("EFECTIVO");
  const [importe, setImporte] = useState(precioPlan);
  const [concepto, setConcepto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  // Al cambiar de tipo se propone el importe que corresponde.
  function cambiarTipo(nuevo: TipoPago) {
    setTipo(nuevo);
    setErrores({});
    setError("");
    setImporte(nuevo === "CUOTA" ? precioPlan : "");
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setErrores({});
    setGuardando(true);

    const datos: DatosPago = tipo === "CUOTA" ? { tipo, fecha, importe, medio } : { tipo, fecha, importe, concepto, medio };

    try {
      await pagosApi.registrar(alumnoId, datos);
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago");
      if (err instanceof ErrorApi) setErrores(err.campos);
    } finally {
      setGuardando(false);
    }
  }

  const sinPlan = tipo === "CUOTA" && !plan;

  return (
    <form className="formulario-pago" onSubmit={enviar} noValidate>
      <h3>Registrar pago</h3>
      {error && <p className="mensaje-error">{error}</p>}

      <div className="opciones-tipo" role="radiogroup" aria-label="Tipo de pago">
        <label>
          <input type="radio" checked={tipo === "CUOTA"} onChange={() => cambiarTipo("CUOTA")} />
          Cuota mensual
        </label>
        <label>
          <input type="radio" checked={tipo === "OTRO"} onChange={() => cambiarTipo("OTRO")} />
          Otro concepto
        </label>
      </div>

      {sinPlan && (
        <p className="mensaje-error">
          El alumno no tiene una membresía asignada. Asignásela desde su ficha (Membresía) para registrar cuotas.
        </p>
      )}

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

        {tipo === "OTRO" && (
          <Campo etiqueta="Concepto" obligatorio errores={errores.concepto}>
            <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej.: remera, evaluación extra" />
          </Campo>
        )}

        <Campo
          etiqueta={tipo === "CUOTA" ? "Importe de la cuota" : "Importe"}
          obligatorio
          errores={errores.importe}
          ayuda={tipo === "CUOTA" && plan ? `Precio de la membresía: ${textoPrecioPlan(plan.precioMensual)}` : undefined}
        >
          <input inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="Ej.: 25.000" />
        </Campo>
      </div>

      {tipo === "CUOTA" && (inicioCuota || /^\d{4}-\d{2}-\d{2}$/.test(fecha)) && (
        <p className="texto-suave">
          La cuota cubre del {formatearFecha(inicioCuota ?? fecha)} al {formatearFecha(sumarMeses(inicioCuota ?? fecha, 1))}.
          {cantidadAdeudadas > 1 && ` Debe ${cantidadAdeudadas} cuotas: este pago cubre la más vieja.`}
        </p>
      )}

      <div className="acciones">
        <button type="submit" className="boton" disabled={guardando || sinPlan}>
          {guardando ? "Guardando…" : "Registrar pago"}
        </button>
        <button type="button" className="boton-secundario" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
