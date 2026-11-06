import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { alumnosApi } from "../api/alumnos";
import { rutinasApi, type Rutina } from "../api/rutinas";
import Cargando from "../componentes/Cargando";
import ListaRutinas from "../componentes/ListaRutinas";
import VolverAlumno from "../componentes/VolverAlumno";
import { useCarga } from "../hooks/useCarga";
import { formatearFechaHora } from "../utils/formato";
import { ETIQUETAS_TIPO_BLOQUE, MODELOS_RUTINA } from "../utils/rutinas";

export default function RutinasAlumno() {
  const alumnoId = Number(useParams().alumnoId);
  const navigate = useNavigate();
  const { datos, error, setError, recargar } = useCarga(
    () => Promise.all([alumnosApi.obtener(alumnoId), rutinasApi.listar(alumnoId)]),
    [alumnoId],
  );
  const [busqueda] = useSearchParams();
  const [eligiendoTipo, setEligiendoTipo] = useState(busqueda.has("nueva"));
  // Con "Nueva rutina" de Inicio, todo el recorrido vuelve a Inicio.
  const origen = useLocation().state;
  const desdeInicio = origen?.desde === "inicio";

  async function eliminar(rutina: Rutina) {
    const fecha = formatearFechaHora(rutina.creadoEn).slice(0, 10);
    if (!window.confirm(`¿Eliminar la rutina creada el ${fecha}? No se puede deshacer.`)) return;
    try {
      await rutinasApi.eliminar(rutina.id);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la rutina");
    }
  }

  if (!datos) return <Cargando error={error} />;

  const [alumno, rutinas] = datos;

  return (
    <section>
      <VolverAlumno alumno={alumno} a={desdeInicio ? "/" : "/rutinas"} texto={desdeInicio ? "Inicio" : "Rutinas"} />

      <div className="pagina-encabezado">
        <div>
          <h1>
            {alumno.apellido}, {alumno.nombre}
          </h1>
          <Link to={`/alumnos/${alumno.id}`}>Ver ficha del alumno</Link>
        </div>
        {!eligiendoTipo && (
          <button type="button" className="boton" onClick={() => setEligiendoTipo(true)}>
            Nueva rutina
          </button>
        )}
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      {/* Al crear una rutina se elige el modelo y se abre su planilla */}
      {eligiendoTipo && (
        <div className="tarjeta seccion">
          <h2>Elegí el modelo de rutina</h2>
          <div className="opciones-bloque">
            {MODELOS_RUTINA.map((tipo) => (
              <button
                key={tipo}
                type="button"
                className="opcion-bloque"
                onClick={() => navigate(`/rutinas/${alumno.id}/nueva?tipo=${tipo}`, { state: origen })}
              >
                {ETIQUETAS_TIPO_BLOQUE[tipo]}
              </button>
            ))}
          </div>
          <button type="button" className="boton-secundario" onClick={() => setEligiendoTipo(false)}>
            Cancelar
          </button>
        </div>
      )}

      <div className="tarjeta seccion">
        <h2>Rutinas</h2>
        {rutinas.length === 0 ? (
          <p className="texto-suave">Todavía no tiene rutinas.</p>
        ) : (
          <ListaRutinas rutinas={rutinas} alumno={alumno} onEliminar={eliminar} />
        )}
      </div>
    </section>
  );
}
