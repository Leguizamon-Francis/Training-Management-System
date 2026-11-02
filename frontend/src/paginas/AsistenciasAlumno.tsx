import { Link, useParams } from "react-router";
import { alumnosApi } from "../api/alumnos";
import { asistenciasApi } from "../api/asistencias";
import BotonVerTodos from "../componentes/BotonVerTodos";
import Cargando from "../componentes/Cargando";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { formatearFecha } from "../utils/formato";

function diaDeLaSemana(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long" });
}

// Historial de asistencias de un alumno.
export default function AsistenciasAlumno() {
  const alumnoId = Number(useParams().alumnoId);
  const { datos, error } = useCarga(
    () => Promise.all([alumnosApi.obtener(alumnoId), asistenciasApi.historial(alumnoId)]),
    [alumnoId],
  );
  const lista = useListaCorta(datos?.[1].fechas ?? [], 10);

  if (!datos) return <Cargando error={error} />;

  const [alumno, historial] = datos;

  return (
    <section>
      <Link to="/asistencias" className="volver">
        ← Asistencias
      </Link>

      <div className="pagina-encabezado">
        <div>
          <h1>
            {alumno.apellido}, {alumno.nombre}
          </h1>
          <Link to={`/alumnos/${alumno.id}`}>Ver ficha del alumno</Link>
        </div>
      </div>

      <div className="indicadores">
        <div className="tarjeta indicador">
          <span className="indicador-etiqueta">Este mes</span>
          <strong className="indicador-valor">{historial.esteMes}</strong>
        </div>
        <div className="tarjeta indicador">
          <span className="indicador-etiqueta">En total</span>
          <strong className="indicador-valor">{historial.total}</strong>
        </div>
      </div>

      <div className="tarjeta seccion">
        <h2>Historial</h2>
        {historial.fechas.length === 0 ? (
          <p className="texto-suave">Todavía no tiene asistencias registradas.</p>
        ) : (
          <>
            <ul className="lista-panel">
              {lista.visibles.map((fecha) => (
                <li key={fecha}>
                  <span>{formatearFecha(fecha)}</span>
                  <span className="texto-suave primera-mayuscula">{diaDeLaSemana(fecha)}</span>
                </li>
              ))}
            </ul>
            <BotonVerTodos lista={lista} femenino />
          </>
        )}
      </div>
    </section>
  );
}
