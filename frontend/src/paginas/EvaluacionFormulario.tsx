import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ErrorApi } from "../api/cliente";
import { evaluacionesApi, type DatosEvaluacion, type Lado, type OrigenResultado } from "../api/evaluaciones";
import { pruebasApi, type CategoriaPrueba, type Prueba } from "../api/pruebas";
import Campo from "../componentes/Campo";
import Cargando from "../componentes/Cargando";
import { ETIQUETAS_CATEGORIA, ETIQUETAS_LADO, ETIQUETAS_ORIGEN } from "../utils/evaluaciones";
import { hoyComoTexto } from "../utils/formato";

// Una fila del formulario = un resultado. "clave" identifica la fila para React
// (no se puede usar la posición porque las filas se agregan y se quitan).
interface FilaResultado {
  clave: number;
  pruebaId: string;
  lado: Lado | "";
  valor: string;
  unidad: string;
  origen: OrigenResultado;
  observacion: string;
}

let ultimaClave = 0;

function filaVacia(): FilaResultado {
  ultimaClave += 1;
  return { clave: ultimaClave, pruebaId: "", lado: "", valor: "", unidad: "", origen: "MANUAL", observacion: "" };
}

// Se usa para cargar (/alumnos/:id/evaluaciones/nueva) y para editar (/evaluaciones/:evaluacionId/editar).
export default function EvaluacionFormulario() {
  const parametros = useParams();
  const evaluacionId = parametros.evaluacionId ? Number(parametros.evaluacionId) : null;
  const navigate = useNavigate();

  const [alumnoId, setAlumnoId] = useState(parametros.id ? Number(parametros.id) : null);
  const [pruebas, setPruebas] = useState<Prueba[]>([]);
  const [fecha, setFecha] = useState(hoyComoTexto());
  const [observaciones, setObservaciones] = useState("");
  const [numero, setNumero] = useState<number | null>(null); // "Evaluación n°" (solo al editar)
  const [filas, setFilas] = useState<FilaResultado[]>([filaVacia()]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Se traen todas las pruebas (también las inactivas) para poder mostrar las de evaluaciones viejas.
    Promise.all([pruebasApi.listar(true), evaluacionId ? evaluacionesApi.obtener(evaluacionId) : null])
      .then(([listaPruebas, evaluacion]) => {
        setPruebas(listaPruebas);
        if (evaluacion) {
          setAlumnoId(evaluacion.alumnoId);
          setFecha(evaluacion.fecha.slice(0, 10));
          setObservaciones(evaluacion.observaciones ?? "");
          setNumero(evaluacion.idEvaluacion);
          setFilas(
            evaluacion.resultados.map((resultado) => ({
              ...filaVacia(),
              pruebaId: String(resultado.pruebaId),
              lado: resultado.lado ?? "",
              valor: resultado.valor.replace(".", ","),
              unidad: resultado.unidad,
              origen: resultado.origen,
              observacion: resultado.observacion ?? "",
            })),
          );
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setCargando(false));
  }, [evaluacionId]);

  // Al editar se vuelve al detalle de la evaluación; al crear, a las evaluaciones del alumno.
  const volverA = evaluacionId
    ? `/evaluaciones/${evaluacionId}`
    : alumnoId
      ? `/alumnos/${alumnoId}/evaluaciones`
      : "/alumnos";

  function cambiarFila(clave: number, campo: keyof FilaResultado, valor: string) {
    setFilas((anteriores) =>
      anteriores.map((fila) => {
        if (fila.clave !== clave) return fila;
        const nueva = { ...fila, [campo]: valor };
        // Al elegir la prueba se completa su unidad (se puede cambiar después).
        if (campo === "pruebaId") {
          const prueba = pruebas.find((p) => String(p.id) === valor);
          nueva.unidad = prueba?.unidad ?? "";
          // El lado solo existe en las pruebas que se miden por lado.
          if (!prueba?.porLado) nueva.lado = "";
        }
        return nueva;
      }),
    );
  }

  function quitarFila(clave: number) {
    setFilas((anteriores) => anteriores.filter((fila) => fila.clave !== clave));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!alumnoId) return;
    setError("");
    setErrores({});
    setGuardando(true);

    const datos: DatosEvaluacion = {
      fecha,
      observaciones,
      resultados: filas.map((fila) => ({
        pruebaId: fila.pruebaId ? Number(fila.pruebaId) : null,
        valor: fila.valor,
        unidad: fila.unidad,
        lado: fila.lado || null,
        origen: fila.origen,
        observacion: fila.observacion,
      })),
    };

    try {
      if (evaluacionId) {
        await evaluacionesApi.actualizar(evaluacionId, datos);
      } else {
        await evaluacionesApi.crear(alumnoId, datos);
      }
      navigate(volverA);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      if (err instanceof ErrorApi) setErrores(err.campos);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <Cargando />;
  }

  const categorias = Object.keys(ETIQUETAS_CATEGORIA) as CategoriaPrueba[];

  return (
    <section>
      <Link to={volverA} className="volver">
        ← Volver
      </Link>
      <h1>{evaluacionId ? `Editar evaluación n° ${numero ?? ""}` : "Nueva evaluación"}</h1>

      {error && <p className="mensaje-error">{error}</p>}

      <form onSubmit={enviar} noValidate>
        <div className="tarjeta seccion">
          <div className="grilla">
            <Campo etiqueta="Fecha" obligatorio errores={errores.fecha}>
              <input type="date" value={fecha} max={hoyComoTexto()} onChange={(e) => setFecha(e.target.value)} />
            </Campo>
          </div>
          <Campo etiqueta="Observaciones" errores={errores.observaciones}>
            <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </Campo>
        </div>

        <div className="tarjeta seccion">
          <h2>Resultados</h2>
          <p className="texto-suave">
            Una fila por prueba. En las pruebas que se miden por lado, cargá una fila por cada lado.
          </p>
          {errores.resultados && <p className="mensaje-error">{errores.resultados.join(". ")}</p>}

          {filas.map((fila, indice) => {
            const erroresDe = (campo: string) => errores[`resultados.${indice}.${campo}`];
            return (
              <div key={fila.clave} className="fila-resultado">
                <div className="fila-resultado-campos">
                  <Campo etiqueta="Prueba" obligatorio errores={erroresDe("pruebaId")}>
                    <select value={fila.pruebaId} onChange={(e) => cambiarFila(fila.clave, "pruebaId", e.target.value)}>
                      <option value="">Elegí una prueba…</option>
                      {categorias.map((categoria) => {
                        // Las inactivas solo aparecen si ya estaban elegidas en esta fila.
                        const opciones = pruebas.filter(
                          (p) => p.categoria === categoria && (p.activa || String(p.id) === fila.pruebaId),
                        );
                        return opciones.length === 0 ? null : (
                          <optgroup key={categoria} label={ETIQUETAS_CATEGORIA[categoria]}>
                            {opciones.map((prueba) => (
                              <option key={prueba.id} value={prueba.id}>
                                {prueba.nombre}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </Campo>
                  {/* "Lado" solo aparece si la prueba elegida se mide por lado */}
                  {(pruebas.find((p) => String(p.id) === fila.pruebaId)?.porLado || fila.lado) && (
                    <Campo etiqueta="Lado" errores={erroresDe("lado")}>
                      <select value={fila.lado} onChange={(e) => cambiarFila(fila.clave, "lado", e.target.value)}>
                        <option value="">—</option>
                        {Object.entries(ETIQUETAS_LADO).map(([valor, etiqueta]) => (
                          <option key={valor} value={valor}>
                            {etiqueta}
                          </option>
                        ))}
                      </select>
                    </Campo>
                  )}
                  <Campo etiqueta="Valor" obligatorio errores={erroresDe("valor")}>
                    <input
                      inputMode="decimal"
                      value={fila.valor}
                      onChange={(e) => cambiarFila(fila.clave, "valor", e.target.value)}
                      placeholder="Ej.: 32,5"
                    />
                  </Campo>
                  <Campo etiqueta="Unidad" errores={erroresDe("unidad")}>
                    <input value={fila.unidad} onChange={(e) => cambiarFila(fila.clave, "unidad", e.target.value)} />
                  </Campo>
                  <Campo etiqueta="Origen" errores={erroresDe("origen")}>
                    <select value={fila.origen} onChange={(e) => cambiarFila(fila.clave, "origen", e.target.value)}>
                      {Object.entries(ETIQUETAS_ORIGEN).map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>
                          {etiqueta}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>
                <div className="fila-resultado-pie">
                  <Campo etiqueta="Observación" errores={erroresDe("observacion")}>
                    <input value={fila.observacion} onChange={(e) => cambiarFila(fila.clave, "observacion", e.target.value)} />
                  </Campo>
                  {filas.length > 1 && (
                    <button type="button" className="boton-link peligro" onClick={() => quitarFila(fila.clave)}>
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button type="button" className="boton-secundario" onClick={() => setFilas([...filas, filaVacia()])}>
            + Agregar resultado
          </button>
        </div>

        <div className="acciones">
          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? "Guardando…" : evaluacionId ? "Guardar cambios" : "Guardar evaluación"}
          </button>
          <Link to={volverA} className="boton-secundario">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
