import { Link } from "react-router";
import { asistenciasApi } from "../api/asistencias";
import { useCarga } from "../hooks/useCarga";
import { formatearFecha } from "../utils/formato";
import Desplegable from "./Desplegable";
import { Flecha } from "./Iconos";

// Sección "Asistencias" de la ficha del alumno: el resumen; el historial completo está en su pantalla.
export default function AsistenciasFicha({ alumnoId }: { alumnoId: number }) {
  const { datos: historial, error } = useCarga(() => asistenciasApi.historial(alumnoId), [alumnoId]);

  return (
    <Desplegable titulo="Asistencias">
      {error && <p className="mensaje-error">{error}</p>}
      {historial && (
        <div className="fila-plan">
          <span>
            Este mes: {historial.esteMes} · En total: {historial.total}
            {historial.fechas[0] && ` · Última: ${formatearFecha(historial.fechas[0])}`}
          </span>
          <Link to={`/asistencias/${alumnoId}`} className="link-discreto">
            Ver historial<Flecha hacia="adelante" />
          </Link>
        </div>
      )}
    </Desplegable>
  );
}
