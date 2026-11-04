import type { ProximaEvaluacion as DatosProximaEvaluacion } from "../api/evaluaciones";
import { claseProximaEvaluacion, textoDiasRestantes } from "../utils/evaluaciones";
import { formatearFecha } from "../utils/formato";

// Línea con la fecha de la próxima reevaluación y cuánto falta (o cuánto hace que venció).
// discreta: más chica y en gris, para pantallas donde el dato principal es otro (ej.: los gráficos).
export default function ProximaEvaluacion({ datos, discreta = false }: { datos: DatosProximaEvaluacion; discreta?: boolean }) {
  return (
    <p className={discreta ? "proxima-evaluacion discreta" : "proxima-evaluacion"}>
      <span>
        Próxima evaluación: <strong>{formatearFecha(datos.fecha)}</strong>
      </span>
      <span className={claseProximaEvaluacion(datos)}>{textoDiasRestantes(datos)}</span>
    </p>
  );
}
