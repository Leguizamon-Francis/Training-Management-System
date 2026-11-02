import { useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { alumnosApi } from "../api/alumnos";
import { rutinasApi, type ModeloRutina, type TipoBloque } from "../api/rutinas";
import PlanillaEditable, { type ControlPlanilla } from "../componentes/PlanillaEditable";
import { useCarga } from "../hooks/useCarga";
import { ETIQUETAS_TIPO_BLOQUE, MODELOS_RUTINA } from "../utils/rutinas";

// Completar una rutina sobre la planilla PDF.
// - Nueva (/rutinas/:alumnoId/nueva?tipo=…): parte de la plantilla del modelo, que nunca se modifica.
//   Con &base=… parte de lo escrito en esa rutina, que tampoco cambia.
// - Existente (/rutinas/editar/:rutinaId): parte de la rutina guardada.
// Al guardar, lo escrito queda en el perfil del alumno.
export default function EditorRutina() {
  const parametros = useParams();
  const [busqueda] = useSearchParams();
  const navigate = useNavigate();
  const rutinaId = parametros.rutinaId ? Number(parametros.rutinaId) : null;
  const baseId = busqueda.get("base") ? Number(busqueda.get("base")) : null;
  const visor = useRef<ControlPlanilla>(null);
  const [guardando, setGuardando] = useState(false);

  const { datos, error, setError } = useCarga(async () => {
    if (rutinaId) {
      const [rutina, pdf] = await Promise.all([rutinasApi.obtener(rutinaId), rutinasApi.pdf(rutinaId)]);
      return { alumno: rutina.alumno, tipo: rutina.tipo, modelo: null, pdf };
    }
    const modelo = MODELOS_RUTINA.find((tipo) => tipo === busqueda.get("tipo"));
    if (!modelo) throw new Error("Falta elegir el modelo de rutina");
    const alumnoId = Number(parametros.alumnoId);
    const [alumno, pdf] = await Promise.all([alumnosApi.obtener(alumnoId), rutinasApi.borrador(alumnoId, modelo, baseId)]);
    return { alumno, tipo: modelo as TipoBloque, modelo: modelo as ModeloRutina | null, pdf };
  }, [rutinaId, parametros.alumnoId, busqueda]);

  async function guardar() {
    if (!datos || !visor.current) return;
    setError("");
    setGuardando(true);
    try {
      const pdf = await visor.current.obtenerPdf();
      if (rutinaId) await rutinasApi.actualizar(rutinaId, pdf);
      else if (datos.modelo) await rutinasApi.crear(datos.alumno.id, datos.modelo, pdf);
      navigate(`/rutinas/${datos.alumno.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la rutina");
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    if (!datos) return;
    if (window.confirm("¿Salir sin guardar? Se pierde lo que escribiste en la planilla.")) {
      navigate(`/rutinas/${datos.alumno.id}`);
    }
  }

  if (!datos) {
    return error ? (
      <>
        <p className="mensaje-error">{error}</p>
        <Link to="/rutinas">← Rutinas</Link>
      </>
    ) : (
      <p className="texto-suave">Cargando…</p>
    );
  }

  return (
    <section>
      <Link to={`/rutinas/${datos.alumno.id}`} className="volver">
        ← Rutinas de {datos.alumno.apellido}, {datos.alumno.nombre}
      </Link>

      <div className="pagina-encabezado">
        <div>
          <h1>{rutinaId ? "Rutina" : "Nueva rutina"}</h1>
          <p className="texto-suave subtitulo">
            {datos.alumno.apellido}, {datos.alumno.nombre} · {ETIQUETAS_TIPO_BLOQUE[datos.tipo]}
            {baseId && " · A partir de una rutina anterior"}
          </p>
        </div>
        <div className="acciones">
          <button type="button" className="boton" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : rutinaId ? "Guardar cambios" : "Guardar rutina"}
          </button>
          <button type="button" className="boton-secundario" onClick={cancelar} disabled={guardando}>
            Cancelar
          </button>
        </div>
      </div>

      {error && <p className="mensaje-error">{error}</p>}
      <p className="texto-suave">
        Completá los campos de la planilla haciendo clic sobre ellos.
        <span className="solo-angosto"> Deslizá con el dedo para ver toda la hoja.</span>
      </p>

      <PlanillaEditable ref={visor} datos={datos.pdf} />
    </section>
  );
}
