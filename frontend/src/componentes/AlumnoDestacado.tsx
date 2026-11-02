import { Link } from "react-router";
import type { Destacado } from "../api/asistencias";

// Quién tuvo más asistencias en un período (si empatan, todos). null = nadie vino en ese período.
export default function AlumnoDestacado({ periodo, destacado }: { periodo: string; destacado: Destacado | null }) {
  const plural = (destacado?.alumnos.length ?? 1) > 1;

  return (
    <div className="tarjeta seccion">
      <h2>
        {plural ? "Alumnos" : "Alumno"} con más asistencias · {periodo}
      </h2>
      {destacado ? (
        <ul className="lista-panel">
          {destacado.alumnos.map((alumno) => (
            <li key={alumno.id}>
              <Link to={`/asistencias/${alumno.id}`}>
                {alumno.apellido}, {alumno.nombre}
              </Link>
              <span className="texto-suave">
                {destacado.cantidad} {destacado.cantidad === 1 ? "asistencia" : "asistencias"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="texto-suave">Todavía no hay asistencias en este período.</p>
      )}
    </div>
  );
}
