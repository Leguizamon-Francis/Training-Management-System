import { useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { alumnosApi } from "../api/alumnos";
import { rutinasApi, type ModeloRutina, type TipoBloque } from "../api/rutinas";
import Cargando from "../componentes/Cargando";
import PlanillaEditable, { type ControlPlanilla } from "../componentes/PlanillaEditable";
import { useCarga } from "../hooks/useCarga";
import { formatearFechaHora } from "../utils/formato";
import { ETIQUETAS_TIPO_BLOQUE, MODELOS_RUTINA } from "../utils/rutinas";
import { useConfirmar } from "../componentes/Confirmar";
import { Flecha } from "../componentes/Iconos";
import GuardarEn from "../componentes/GuardarEn";

// Completar una rutina sobre la planilla PDF.
// - Nueva (/rutinas/:alumnoId/nueva?tipo=…, o /rutinas/sin-alumno/nueva?tipo=…): parte de la plantilla del
//   modelo, que nunca se modifica. Con &base=… (rutina del mismo alumno, o sin alumno) parte de lo escrito en
//   esa rutina, que tampoco cambia; ahí aparece también "Guardar en…" (otro alumno o descargar sin guardar).
// - Existente (/rutinas/editar/:rutinaId): parte de la rutina guardada.
// Al guardar, lo escrito queda en el perfil del alumno, o en "Rutinas sin alumno".
export default function EditorRutina() {
  const confirmar = useConfirmar();
  const parametros = useParams();
  const [busqueda] = useSearchParams();
  const navigate = useNavigate();
  const origen = useLocation().state; // se devuelve al volver: si se vino desde Inicio, la vuelta sigue hasta Inicio
  const rutinaId = parametros.rutinaId ? Number(parametros.rutinaId) : null;
  const baseId = busqueda.get("base") ? Number(busqueda.get("base")) : null;
  const visor = useRef<ControlPlanilla>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardandoEn, setGuardandoEn] = useState(false); // ventana "Guardar en" abierta

  const { datos, error, setError } = useCarga(async () => {
    if (rutinaId) {
      // Primero los datos y después el PDF: así leidaEn es anterior a lo que trae el PDF y, al guardar, se conserva
      // todo lo que el alumno haya cambiado después (con el link del celular).
      const rutina = await rutinasApi.obtener(rutinaId);
      const pdf = await rutinasApi.pdf(rutinaId);
      return { alumno: rutina.alumno, tipo: rutina.tipo, modelo: null, pdf, leidaEn: rutina.leidaEn, alumnoEditoEn: rutina.alumnoEditoEn };
    }
    const modelo = MODELOS_RUTINA.find((tipo) => tipo === busqueda.get("tipo"));
    if (!modelo) throw new Error("Falta elegir el modelo de rutina");
    const alumnoId = parametros.alumnoId ? Number(parametros.alumnoId) : null;
    const [alumno, pdf] = await Promise.all([
      alumnoId ? alumnosApi.obtener(alumnoId) : null,
      rutinasApi.borrador(alumnoId, modelo, baseId),
    ]);
    return { alumno, tipo: modelo as TipoBloque, modelo: modelo as ModeloRutina | null, pdf, leidaEn: null, alumnoEditoEn: null };
  }, [rutinaId, parametros.alumnoId, busqueda]);

  const volverA = datos?.alumno ? `/rutinas/${datos.alumno.id}` : "/rutinas";

  async function guardar() {
    if (!datos || !visor.current) return;
    setError("");
    setGuardando(true);
    try {
      const pdf = await visor.current.obtenerPdf();
      if (rutinaId && datos.leidaEn) await rutinasApi.actualizar(rutinaId, pdf, datos.leidaEn);
      else if (datos.modelo) await rutinasApi.crear(datos.alumno?.id ?? null, datos.modelo, pdf);
      navigate(volverA, { state: origen });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la rutina");
    } finally {
      setGuardando(false);
    }
  }

  // "Guardar en" (solo al partir de una rutina base): la rutina nueva va a otro alumno, con su nombre y edad.
  async function guardarEn(alumno: { id: number; nombre: string; apellido: string }) {
    if (!datos?.modelo || !visor.current) return;
    setError("");
    setGuardando(true);
    try {
      const pdf = await visor.current.obtenerPdf();
      await rutinasApi.crear(alumno.id, datos.modelo, pdf, true);
      navigate(`/rutinas/${alumno.id}`, { state: origen });
    } catch (err) {
      setGuardandoEn(false);
      setError(err instanceof Error ? err.message : "No se pudo guardar la rutina");
    } finally {
      setGuardando(false);
    }
  }

  // Descarga la planilla tal como está en pantalla, sin guardarla en el sistema.
  async function descargar() {
    if (!visor.current) return;
    setError("");
    try {
      const pdf = await visor.current.obtenerPdf();
      const url = URL.createObjectURL(new Blob([pdf.slice()], { type: "application/pdf" }));
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `Rutina ${para.replace(",", "")}.pdf`;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setGuardandoEn(false);
    } catch {
      setError("No se pudo descargar la rutina");
    }
  }

  async function cancelar() {
    const si = await confirmar({
      titulo: "¿Salir sin guardar?",
      mensaje: "Se pierde lo que escribiste en la planilla.",
      textoConfirmar: "Salir sin guardar",
      textoCancelar: "Seguir editando",
      peligro: true,
    });
    if (si) {
      navigate(volverA, { state: origen });
    }
  }

  if (!datos) {
    return error ? (
      <>
        <p className="mensaje-error">{error}</p>
        <Link to="/rutinas">
          <Flecha hacia="atras" />
          Rutinas
        </Link>
      </>
    ) : (
      <Cargando />
    );
  }

  const para = datos.alumno ? `${datos.alumno.apellido}, ${datos.alumno.nombre}` : "Sin alumno";

  return (
    <section>
      <Link to={volverA} state={origen} className="volver">
        <Flecha hacia="atras" />
        {datos.alumno ? `Rutinas de ${para}` : "Rutinas"}
      </Link>

      <div className="pagina-encabezado">
        <div>
          <h1>{rutinaId ? "Rutina" : "Nueva rutina"}</h1>
          <p className="texto-suave subtitulo">
            {para} · {ETIQUETAS_TIPO_BLOQUE[datos.tipo]}
            {baseId && " · A partir de una rutina anterior"}
          </p>
          {datos.alumnoEditoEn && (
            <p className="texto-suave subtitulo">Última anotación del alumno: {formatearFechaHora(datos.alumnoEditoEn)}</p>
          )}
        </div>
      </div>

      <p className="texto-suave">
        Completá los campos de la planilla haciendo clic sobre ellos.
        <span className="solo-angosto"> Deslizá con el dedo para ver toda la hoja.</span>
      </p>

      <PlanillaEditable ref={visor} datos={datos.pdf} />

      {error && <p className="mensaje-error">{error}</p>}
      <div className="acciones acciones-formulario acciones-planilla">
        <button type="button" className="boton" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : rutinaId ? "Guardar cambios" : "Guardar rutina"}
        </button>
        <button type="button" className="boton-secundario" onClick={cancelar} disabled={guardando}>
          Cancelar
        </button>
        {/* Queda entre Cancelar y Guardar rutina (el botón principal va siempre último). */}
        {baseId && !rutinaId && (
          <button type="button" className="boton-secundario" onClick={() => setGuardandoEn(true)} disabled={guardando}>
            Guardar en…
          </button>
        )}
      </div>

      {guardandoEn && (
        <GuardarEn
          alumnoActualId={datos.alumno?.id ?? null}
          ocupado={guardando}
          onAlumno={guardarEn}
          onDescargar={descargar}
          onCerrar={() => setGuardandoEn(false)}
        />
      )}
    </section>
  );
}
