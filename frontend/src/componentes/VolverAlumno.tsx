import { Link, useLocation } from "react-router";
import { Flecha } from "./Iconos";

interface Props {
  alumno: { id: number; nombre: string; apellido: string };
  a: string; // a dónde vuelve normalmente
  texto: string;
}

// Enlace para volver de las pantallas de un alumno (membresía, asistencias, evaluaciones, rutinas). Si se llegó
// desde un cuadro del resumen de su ficha, vuelve a la ficha.
export default function VolverAlumno({ alumno, a, texto }: Props) {
  const desdeFicha = useLocation().state?.desde === "ficha";
  return desdeFicha ? (
    <Link to={`/alumnos/${alumno.id}`} className="volver">
      <Flecha hacia="atras" />
      {alumno.apellido}, {alumno.nombre}
    </Link>
  ) : (
    <Link to={a} className="volver">
      <Flecha hacia="atras" />
      {texto}
    </Link>
  );
}
