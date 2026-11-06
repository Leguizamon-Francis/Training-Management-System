import { Link, useLocation, useParams } from "react-router";
import { alumnosApi } from "../api/alumnos";
import Cargando from "../componentes/Cargando";
import PagosAlumno from "../componentes/PagosAlumno";
import VolverAlumno from "../componentes/VolverAlumno";
import { useCarga } from "../hooks/useCarga";

// Pagos de un alumno, desde Membresías o el Historial de ingresos: lo mismo que "Membresía" de la ficha, abierto.
export default function PagosDeAlumno() {
  const alumnoId = Number(useParams().id);
  const desdeIngresos = useLocation().state?.desde === "ingresos";
  // Se recarga después de cambios que afectan al alumno (ej.: "Anular deuda" con baja).
  const { datos: alumno, error, recargar } = useCarga(() => alumnosApi.obtener(alumnoId), [alumnoId]);

  if (!alumno) return <Cargando error={error} />;

  return (
    <section>
      <VolverAlumno
        alumno={alumno}
        a={desdeIngresos ? "/membresias/ingresos" : "/membresias"}
        texto={desdeIngresos ? "Historial de ingresos" : "Membresías"}
      />
      <div className="pagina-encabezado">
        <div>
          <h1>
            {alumno.apellido}, {alumno.nombre}
          </h1>
          {!alumno.activo && <span className="insignia">Inactivo</span>}
        </div>
        <Link to={`/alumnos/${alumno.id}`} className="link-discreto">
          Ver ficha del alumno →
        </Link>
      </div>

      <PagosAlumno alumno={alumno} onCambio={recargar} enFicha={false} />
    </section>
  );
}
