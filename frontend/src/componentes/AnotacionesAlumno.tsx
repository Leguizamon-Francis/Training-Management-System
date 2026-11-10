import { useState, type FormEvent } from "react";
import { anotacionesApi, type Anotacion, type DatosAnotacion, type TipoAnotacion } from "../api/anotaciones";
import { ErrorApi } from "../api/cliente";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { ETIQUETAS_TIPO_ANOTACION } from "../utils/anotaciones";
import { formatearFecha, hoyComoTexto } from "../utils/formato";
import BotonVerTodos from "./BotonVerTodos";
import Campo from "./Campo";
import Cargando from "./Cargando";
import Desplegable from "./Desplegable";
import { useConfirmar } from "./Confirmar";

// Caracteres del detalle que se muestran antes de "Ver más".
const LARGO_RESUMEN = 60;

function anotacionVacia(): DatosAnotacion {
  return { fecha: hoyComoTexto(), tipo: "OBSERVACION", detalle: "", motivo: "" };
}

// El campo "motivo" ya no se carga ni se muestra, pero las anotaciones viejas que lo tienen
// lo conservan (viaja sin cambios al editar).
function datosDesdeAnotacion(anotacion: Anotacion): DatosAnotacion {
  return {
    fecha: anotacion.fecha.slice(0, 10),
    tipo: anotacion.tipo,
    detalle: anotacion.detalle,
    motivo: anotacion.motivo ?? "",
  };
}

interface PropsFormulario {
  inicial: DatosAnotacion;
  textoBoton: string;
  onGuardar: (datos: DatosAnotacion) => Promise<void>;
  onCancelar?: () => void;
}

// Se usa para cargar una anotación nueva y para editar una existente.
function FormularioAnotacion({ inicial, textoBoton, onGuardar, onCancelar }: PropsFormulario) {
  const [datos, setDatos] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  function cambiar(campo: keyof DatosAnotacion, valor: string) {
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setErrores({});
    setGuardando(true);
    try {
      await onGuardar(datos);
      // Al cargar una nueva, el formulario queda limpio para la siguiente.
      setDatos(anotacionVacia());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      if (err instanceof ErrorApi) setErrores(err.campos);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="formulario-anotacion" onSubmit={enviar} noValidate>
      {error && <p className="mensaje-error">{error}</p>}
      <div className="grilla">
        <Campo etiqueta="Fecha" obligatorio errores={errores.fecha}>
          <input type="date" value={datos.fecha} max={hoyComoTexto()} onChange={(e) => cambiar("fecha", e.target.value)} />
        </Campo>
        <Campo etiqueta="Tipo" obligatorio errores={errores.tipo}>
          <select value={datos.tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
            {Object.entries(ETIQUETAS_TIPO_ANOTACION).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo etiqueta="Detalle" obligatorio errores={errores.detalle}>
        <textarea
          rows={3}
          value={datos.detalle}
          onChange={(e) => cambiar("detalle", e.target.value)}
          placeholder="Ej.: se reemplazó sentadilla con barra por sentadilla goblet"
        />
      </Campo>
      <div className="acciones acciones-formulario">
        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? "Guardando…" : textoBoton}
        </button>
        {onCancelar && (
          <button type="button" className="boton-secundario" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

// Sección de anotaciones de entrenamiento dentro de la ficha del alumno.
export default function AnotacionesAlumno({ alumnoId }: { alumnoId: number }) {
  const confirmar = useConfirmar();
  const { datos: anotaciones, error, setError, recargar } = useCarga(() => anotacionesApi.listar(alumnoId), [alumnoId]);
  const [filtroTipo, setFiltroTipo] = useState<TipoAnotacion | "">("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [ampliadas, setAmpliadas] = useState<Set<number>>(new Set()); // con el detalle completo a la vista

  const filtradas = anotaciones?.filter((a) => !filtroTipo || a.tipo === filtroTipo) ?? [];
  const lista = useListaCorta(filtradas, 2);

  function alternarAmpliada(id: number) {
    setAmpliadas((anteriores) => {
      const nuevas = new Set(anteriores);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });
  }

  async function crear(datos: DatosAnotacion) {
    await anotacionesApi.crear(alumnoId, datos);
    await recargar();
  }

  async function actualizar(id: number, datos: DatosAnotacion) {
    await anotacionesApi.actualizar(id, datos);
    setEditandoId(null);
    await recargar();
  }

  async function eliminar(anotacion: Anotacion) {
    const si = await confirmar({
      titulo: "¿Eliminar la anotación?",
      mensaje: `Anotación del ${formatearFecha(anotacion.fecha)}. No se puede deshacer.`,
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!si) return;
    try {
      await anotacionesApi.eliminar(anotacion.id);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <Desplegable titulo="Anotaciones de entrenamiento">
      <FormularioAnotacion inicial={anotacionVacia()} textoBoton="Agregar anotación" onGuardar={crear} />

      <div className="separador" />

      {error && <p className="mensaje-error">{error}</p>}

      {anotaciones === null ? (
        !error && <Cargando />
      ) : anotaciones.length === 0 ? (
        <p className="texto-suave">Todavía no hay anotaciones.</p>
      ) : (
        <>
          <div className="lista-encabezado">
            <span className="texto-suave">
              {filtradas.length} {filtradas.length === 1 ? "anotación" : "anotaciones"}
            </span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as TipoAnotacion | "")}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(ETIQUETAS_TIPO_ANOTACION).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>

          <ul className="lista-anotaciones">
            {lista.visibles.map((anotacion) =>
              editandoId === anotacion.id ? (
                <li key={anotacion.id} className="anotacion">
                  <FormularioAnotacion
                    inicial={datosDesdeAnotacion(anotacion)}
                    textoBoton="Guardar cambios"
                    onGuardar={(datos) => actualizar(anotacion.id, datos)}
                    onCancelar={() => setEditandoId(null)}
                  />
                </li>
              ) : (
                <li key={anotacion.id} className="anotacion">
                  <div className="anotacion-cabecera">
                    <span className="insignia">{ETIQUETAS_TIPO_ANOTACION[anotacion.tipo]}</span>
                    <span className="texto-suave">{formatearFecha(anotacion.fecha)}</span>
                    <div className="anotacion-acciones">
                      <button type="button" className="boton-link" onClick={() => setEditandoId(anotacion.id)}>
                        Editar
                      </button>
                      <button type="button" className="boton-link peligro" onClick={() => eliminar(anotacion)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <p className="texto-largo">
                    {anotacion.detalle.length <= LARGO_RESUMEN || ampliadas.has(anotacion.id)
                      ? anotacion.detalle
                      : `${anotacion.detalle.slice(0, LARGO_RESUMEN).trimEnd()}…`}
                    {anotacion.detalle.length > LARGO_RESUMEN && (
                      <button type="button" className="boton-link boton-ampliar" onClick={() => alternarAmpliada(anotacion.id)}>
                        {ampliadas.has(anotacion.id) ? "Ver menos" : "Ver más"}
                      </button>
                    )}
                  </p>
                </li>
              ),
            )}
          </ul>

          {filtradas.length === 0 && <p className="texto-suave">No hay anotaciones de ese tipo.</p>}

          <BotonVerTodos lista={lista} femenino />
        </>
      )}
    </Desplegable>
  );
}
