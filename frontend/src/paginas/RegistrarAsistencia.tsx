import { useState } from "react";
import { Link } from "react-router";
import { asistenciasApi, type AlumnoDelDia } from "../api/asistencias";
import Cargando from "../componentes/Cargando";
import { useCarga } from "../hooks/useCarga";
import { coincideBusqueda, hoyComoTexto } from "../utils/formato";

// Un clic en el alumno registra la asistencia; otro clic la quita, por si se tocó el nombre equivocado.
export default function RegistrarAsistencia() {
  const [fecha, setFecha] = useState(hoyComoTexto());
  const [buscar, setBuscar] = useState("");
  const [guardando, setGuardando] = useState<number | null>(null);
  const { datos: alumnos, error, setError, recargar } = useCarga(() => asistenciasApi.dia(fecha), [fecha]);

  async function alternar(alumno: AlumnoDelDia) {
    setGuardando(alumno.id);
    try {
      if (alumno.presente) await asistenciasApi.quitar(alumno.id, fecha);
      else await asistenciasApi.registrar(alumno.id, fecha);
      await recargar();
      setBuscar(""); // la lista vuelve a estar completa para buscar al siguiente
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la asistencia");
    } finally {
      setGuardando(null);
    }
  }

  if (!alumnos) return <Cargando error={error} />;

  const visibles = alumnos.filter((a) => coincideBusqueda(`${a.nombre} ${a.apellido}`, buscar));
  const presentes = alumnos.filter((a) => a.presente).length;

  return (
    <section>
      <Link to="/asistencias" className="volver">
        ← Asistencias
      </Link>

      <h1>Registrar asistencia</h1>
      <p className="texto-suave">
        Tocá un alumno para registrarlo. {presentes} {presentes === 1 ? "presente" : "presentes"} en esta fecha.
      </p>

      <div className="filtros filtros-asistencia">
        <input
          type="search"
          placeholder="Buscar alumno"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          aria-label="Buscar alumno"
        />
        <input
          type="date"
          value={fecha}
          max={hoyComoTexto()}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
          aria-label="Fecha de la asistencia"
        />
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      {visibles.length === 0 ? (
        <p className="texto-suave">No hay alumnos que coincidan.</p>
      ) : (
        <ul className="lista-asistencia">
          {visibles.map((alumno) => (
            <li key={alumno.id}>
              <button
                type="button"
                className={alumno.presente ? "presente" : ""}
                aria-pressed={alumno.presente}
                disabled={guardando !== null}
                onClick={() => alternar(alumno)}
              >
                <span>
                  {alumno.apellido}, {alumno.nombre}
                </span>
                {alumno.presente && <span className="insignia insignia-ok">Presente</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
