import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { alumnosApi, type AlumnoResumen } from "../api/alumnos";
import { ErrorApi } from "../api/cliente";
import BotonVerTodos from "../componentes/BotonVerTodos";
import Campo from "../componentes/Campo";
import Cargando from "../componentes/Cargando";
import { useCarga } from "../hooks/useCarga";
import { ALUMNOS_POR_LISTA, useListaCorta } from "../hooks/useListaCorta";
import { coincideBusqueda } from "../utils/formato";
import { Flecha } from "../componentes/Iconos";

interface PropsConfirmacion {
  alumno: AlumnoResumen;
  onEliminado: () => void;
  onCancelar: () => void;
}

// Pide la contraseña antes de borrar: no se puede deshacer.
function Confirmacion({ alumno, onEliminado, onCancelar }: PropsConfirmacion) {
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setErrores({});
    setGuardando(true);
    try {
      await alumnosApi.eliminar(alumno.id, password);
      onEliminado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el alumno");
      if (err instanceof ErrorApi) setErrores(err.campos);
      setGuardando(false);
    }
  }

  return (
    <form className="tarjeta seccion" onSubmit={enviar} noValidate>
      <h2>
        ¿Eliminar a {alumno.apellido}, {alumno.nombre}?
      </h2>
      <p className="mensaje-error">
        Se borran para siempre su ficha, anotaciones, evaluaciones, rutinas, asistencias, cuotas, pagos e historial. Sus pagos dejan de contar en el
        reporte de ingresos. No se puede deshacer.
      </p>
      {error && !errores.password && <p className="mensaje-error">{error}</p>}
      <div className="grilla">
        <Campo etiqueta="Tu contraseña" obligatorio errores={errores.password}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
        </Campo>
      </div>
      <div className="acciones acciones-formulario">
        <button type="submit" className="boton-eliminar" disabled={guardando}>
          {guardando ? "Eliminando…" : "Eliminar definitivamente"}
        </button>
        <button type="button" className="boton-secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Eliminación permanente de un alumno. Para que deje de venir alcanza con darlo de baja desde su ficha.
export default function EliminarAlumno() {
  const { datos: alumnos, error, recargar } = useCarga(() => alumnosApi.listar({ buscar: "", estado: "todos", perfilId: "" }), []);
  const [buscar, setBuscar] = useState("");
  const [seleccionado, setSeleccionado] = useState<AlumnoResumen | null>(null);
  const [mensaje, setMensaje] = useState("");

  const visibles = alumnos?.filter((a) => coincideBusqueda(`${a.nombre} ${a.apellido} ${a.dni}`, buscar)) ?? [];
  const lista = useListaCorta(visibles, ALUMNOS_POR_LISTA);

  async function eliminado() {
    if (!seleccionado) return;
    setMensaje(`${seleccionado.apellido}, ${seleccionado.nombre} y todos sus datos se eliminaron.`);
    setSeleccionado(null);
    await recargar();
  }

  function elegir(alumno: AlumnoResumen) {
    setMensaje("");
    setSeleccionado(alumno);
  }

  if (!alumnos) return <Cargando error={error} />;

  return (
    <section>
      <Link to="/configuracion" className="volver">
        <Flecha hacia="atras" />
        Configuración
      </Link>
      <h1>Eliminar alumno</h1>
      <p className="texto-suave">Elegí el alumno. Si solo dejó de venir, conviene darlo de baja desde su ficha: así se conservan sus datos.</p>

      {mensaje && <p className="mensaje-ok">{mensaje}</p>}
      {error && <p className="mensaje-error">{error}</p>}

      {seleccionado ? (
        <Confirmacion key={seleccionado.id} alumno={seleccionado} onEliminado={eliminado} onCancelar={() => setSeleccionado(null)} />
      ) : (
        <>
          <div className="filtros filtros-simple">
            <input
              type="search"
              placeholder="Buscar por nombre, apellido o DNI"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              aria-label="Buscar alumno"
            />
          </div>
          {visibles.length === 0 ? (
            <p className="texto-suave">No hay alumnos que coincidan.</p>
          ) : (
            <>
              <ul className="lista-asistencia">
                {lista.visibles.map((alumno) => (
                  <li key={alumno.id}>
                    <button type="button" data-no-en-demo onClick={() => elegir(alumno)}>
                      <span>
                        {alumno.apellido}, {alumno.nombre}
                      </span>
                      {!alumno.activo && <span className="insignia">Inactivo</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <BotonVerTodos lista={lista} textoCerrar="Ver menos" />
            </>
          )}
        </>
      )}
    </section>
  );
}
