import { useState, type ReactNode } from "react";
import { alumnosApi } from "../api/alumnos";
import { planesApi, type Plan } from "../api/planes";
import { useCarga } from "../hooks/useCarga";
import { textoPrecioPlan } from "../utils/pagos";
import { useConfirmar } from "./Confirmar";

interface Props {
  alumnoId: number;
  planActual: Plan | null;
  onCambio: () => void;
  conEtiqueta?: boolean; // en la ficha no: la sección ya se llama "Membresía"
  children?: ReactNode; // lo que va al lado de la lista (ej.: el estado de la cuota)
}

// Lista desplegable para asignar o cambiar la membresía de un alumno (se guarda al elegir).
export default function SelectorPlan({ alumnoId, planActual, onCambio, conEtiqueta = true, children }: Props) {
  const confirmar = useConfirmar();
  const { datos: planes, error, setError } = useCarga(() => planesApi.listar(), []);
  const [guardando, setGuardando] = useState(false);

  async function cambiar(valor: string) {
    // Si se cancela la confirmación, el select vuelve solo al plan actual (su valor sale de planActual).
    const nuevo = planes?.find((plan) => String(plan.id) === valor) ?? null;
    let pregunta: string;
    let accion: string;
    if (!planActual) [pregunta, accion] = [`¿Asignar la membresía "${nuevo?.nombre}"?`, "Asignar"];
    else if (!nuevo) [pregunta, accion] = [`¿Quitar la membresía "${planActual.nombre}"?`, "Quitar"];
    else [pregunta, accion] = [`¿Cambiar la membresía de "${planActual.nombre}" a "${nuevo.nombre}"?`, "Cambiar"];
    if (!(await confirmar({ titulo: pregunta, textoConfirmar: accion }))) return;

    setGuardando(true);
    setError("");
    try {
      await alumnosApi.cambiarPlan(alumnoId, nuevo?.id ?? null);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la membresía");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="pago-plan">
      {conEtiqueta && <label htmlFor={`plan-alumno-${alumnoId}`}>Membresía:</label>}
      <select
        id={`plan-alumno-${alumnoId}`}
        aria-label="Membresía"
        value={planActual?.id ?? ""}
        onChange={(e) => cambiar(e.target.value)}
        disabled={guardando}
      >
        <option value="">Sin membresía</option>
        {planes?.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.nombre} — {textoPrecioPlan(plan.precioMensual)}
          </option>
        ))}
      </select>
      {children}
      {error && <span className="error-campo">{error}</span>}
    </div>
  );
}
