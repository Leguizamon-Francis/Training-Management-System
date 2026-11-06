import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { alumnosApi } from "../api/alumnos";
import { ErrorApi } from "../api/cliente";
import { evaluacionesApi, type DatosEvaluacion, type DatosResultado, type Evaluacion, type OrigenResultado } from "../api/evaluaciones";
import { pruebasApi, type CategoriaPrueba, type Prueba } from "../api/pruebas";
import Campo from "../componentes/Campo";
import Cargando from "../componentes/Cargando";
import { useCarga } from "../hooks/useCarga";
import { ETIQUETAS_CATEGORIA, ETIQUETAS_ORIGEN } from "../utils/evaluaciones";
import { hoyComoTexto } from "../utils/formato";

// Una fila del formulario = una prueba. En las que se miden por lado, la fila tiene un valor para cada lado
// y al guardar se convierte en dos resultados (izquierdo y derecho). "valor" es el de las demás pruebas; en
// una por lado solo lo tendría un resultado viejo cargado sin lado, que no se muestra pero se conserva.
// "clave" identifica la fila para React: no sirve la posición porque las filas se agregan y se quitan.
interface FilaResultado {
  clave: number;
  pruebaId: string;
  valor: string;
  valorIzq: string;
  valorDer: string;
  unidad: string;
  origen: OrigenResultado;
  observacion: string;
}

type CampoValor = "valor" | "valorIzq" | "valorDer";

let ultimaClave = 0;

function filaVacia(): FilaResultado {
  ultimaClave += 1;
  return { clave: ultimaClave, pruebaId: "", valor: "", valorIzq: "", valorDer: "", unidad: "", origen: "MANUAL", observacion: "" };
}

// Resultados guardados → filas: los dos lados de una misma prueba van juntos en una fila.
function filasDesdeEvaluacion(evaluacion: Evaluacion, pruebas: Prueba[]): FilaResultado[] {
  const filas: FilaResultado[] = [];
  for (const resultado of evaluacion.resultados) {
    const porLado = pruebas.find((p) => p.id === resultado.pruebaId)?.porLado ?? false;
    let fila = porLado ? filas.find((f) => f.pruebaId === String(resultado.pruebaId)) : undefined;
    if (!fila) {
      fila = { ...filaVacia(), pruebaId: String(resultado.pruebaId), unidad: resultado.unidad, origen: resultado.origen };
      filas.push(fila);
    }
    const campo: CampoValor = resultado.lado === "IZQ" ? "valorIzq" : resultado.lado === "DER" ? "valorDer" : "valor";
    fila[campo] = resultado.valor.replace(".", ",");
    if (resultado.observacion && !fila.observacion.includes(resultado.observacion)) {
      fila.observacion = fila.observacion ? `${fila.observacion} / ${resultado.observacion}` : resultado.observacion;
    }
  }
  return filas;
}

// Filas → resultados para la API. "origenes" dice de qué fila y campo salió cada resultado, para mostrar
// los errores del backend (que vienen por posición del resultado) en su lugar.
function resultadosDesdeFilas(filas: FilaResultado[], pruebas: Prueba[]) {
  const resultados: DatosResultado[] = [];
  const origenes: { fila: number; campoValor: CampoValor }[] = [];
  filas.forEach((fila, indice) => {
    const comun = {
      pruebaId: fila.pruebaId ? Number(fila.pruebaId) : null,
      unidad: fila.unidad,
      origen: fila.origen,
      observacion: fila.observacion,
    };
    const porLado = pruebas.find((p) => String(p.id) === fila.pruebaId)?.porLado;
    const lados: [CampoValor, DatosResultado["lado"]][] = porLado
      ? [["valorIzq", "IZQ"], ["valorDer", "DER"], ["valor", null]]
      : [["valor", null]];
    for (const [campoValor, lado] of lados) {
      if (porLado && !fila[campoValor].trim()) continue; // por lado: solo los lados que se cargaron
      resultados.push({ ...comun, valor: fila[campoValor], lado });
      origenes.push({ fila: indice, campoValor });
    }
  });
  return { resultados, origenes };
}

// Se usa para cargar (/evaluaciones/alumnos/:id/nueva) y para editar (/evaluaciones/:evaluacionId/editar).
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
    // Se traen todas las pruebas (también las desactivadas y eliminadas) para poder mostrar las de evaluaciones viejas.
    Promise.all([pruebasApi.listar(true, true), evaluacionId ? evaluacionesApi.obtener(evaluacionId) : null])
      .then(([listaPruebas, evaluacion]) => {
        setPruebas(listaPruebas);
        if (evaluacion) {
          setAlumnoId(evaluacion.alumnoId);
          setFecha(evaluacion.fecha.slice(0, 10));
          setObservaciones(evaluacion.observaciones ?? "");
          setNumero(evaluacion.idEvaluacion);
          setFilas(filasDesdeEvaluacion(evaluacion, listaPruebas));
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setCargando(false));
  }, [evaluacionId]);

  const { datos: alumno } = useCarga(() => (alumnoId ? alumnosApi.obtener(alumnoId) : Promise.resolve(null)), [alumnoId]);

  // Al editar se vuelve al detalle de la evaluación; al crear, a las evaluaciones del alumno.
  const volverA = evaluacionId
    ? `/evaluaciones/${evaluacionId}`
    : alumnoId
      ? `/evaluaciones/alumnos/${alumnoId}`
      : "/alumnos";

  const pruebaDe = (fila: FilaResultado) => pruebas.find((p) => String(p.id) === fila.pruebaId);

  function cambiarFila(clave: number, campo: keyof FilaResultado, valor: string) {
    setFilas((anteriores) =>
      anteriores.map((fila) => {
        if (fila.clave !== clave) return fila;
        const nueva = { ...fila, [campo]: valor };
        // Al elegir la prueba se completa su unidad (la del catálogo: no se escribe a mano, para que todos
        // los resultados de una prueba queden en la misma unidad) y se vacían los valores que esa prueba
        // no usa: los de cada lado, o el único.
        if (campo === "pruebaId") {
          const prueba = pruebas.find((p) => String(p.id) === valor);
          nueva.unidad = prueba?.unidad ?? "";
          if (prueba?.porLado) nueva.valor = "";
          else nueva.valorIzq = nueva.valorDer = "";
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

    // En una prueba por lado hace falta al menos un lado (puede faltar uno, ej.: por una lesión).
    const sinLados = filas.findIndex((fila) => pruebaDe(fila)?.porLado && !fila.valorIzq.trim() && !fila.valorDer.trim() && !fila.valor.trim());
    if (sinLados >= 0) {
      setErrores({ [`filas.${sinLados}.valorIzq`]: ["Cargá el izquierdo, el derecho o los dos"] });
      return;
    }

    const { resultados, origenes } = resultadosDesdeFilas(filas, pruebas);
    const datos: DatosEvaluacion = { fecha, observaciones, resultados };

    setGuardando(true);
    try {
      if (evaluacionId) {
        await evaluacionesApi.actualizar(evaluacionId, datos);
      } else {
        await evaluacionesApi.crear(alumnoId, datos);
      }
      navigate(volverA);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      if (err instanceof ErrorApi) {
        // "resultados.3.valor" → el campo de la fila de la que salió el resultado 3.
        const porFila: Record<string, string[]> = {};
        for (const [clave, mensajes] of Object.entries(err.campos)) {
          const partes = clave.match(/^resultados\.(\d+)\.(\w+)$/);
          const origen = partes && origenes[Number(partes[1])];
          const destino = origen ? `filas.${origen.fila}.${partes[2] === "valor" ? origen.campoValor : partes[2]}` : clave;
          porFila[destino] = [...(porFila[destino] ?? []), ...mensajes];
        }
        setErrores(porFila);
      }
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
        ← {evaluacionId ? `Evaluación n° ${numero ?? ""}` : alumno ? `${alumno.apellido}, ${alumno.nombre}` : "Evaluaciones"}
      </Link>
      <h1>{evaluacionId ? `Editar evaluación n° ${numero ?? ""}` : "Nueva evaluación"}</h1>

      {error && <p className="mensaje-error">{error}</p>}

      <form className="formulario-evaluacion" onSubmit={enviar} noValidate>
        <div className="tarjeta seccion fecha-y-observaciones">
          <Campo etiqueta="Fecha" obligatorio errores={errores.fecha}>
            <input type="date" value={fecha} max={hoyComoTexto()} onChange={(e) => setFecha(e.target.value)} />
          </Campo>
          <Campo etiqueta="Observaciones" errores={errores.observaciones}>
            <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </Campo>
        </div>

        <div className="tarjeta seccion">
          <h2>Registros</h2>
          {errores.resultados && <p className="mensaje-error">{errores.resultados.join(". ")}</p>}

          {filas.map((fila, indice) => {
            const erroresDe = (campo: string) => errores[`filas.${indice}.${campo}`];
            const porLado = pruebaDe(fila)?.porLado ?? false;
            const campoValor = (campo: CampoValor, etiqueta: string, obligatorio: boolean) => (
              <Campo etiqueta={etiqueta} obligatorio={obligatorio} errores={erroresDe(campo)}>
                <input
                  inputMode="decimal"
                  value={fila[campo]}
                  onChange={(e) => cambiarFila(fila.clave, campo, e.target.value)}
                  placeholder="Ej.: 32,5"
                />
              </Campo>
            );
            return (
              <div key={fila.clave} className="fila-resultado">
                <div className="fila-resultado-campos">
                  <Campo etiqueta="Test" obligatorio errores={erroresDe("pruebaId")}>
                    <select value={fila.pruebaId} onChange={(e) => cambiarFila(fila.clave, "pruebaId", e.target.value)}>
                      <option value="">Elegí un test…</option>
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
                  {porLado ? (
                    <>
                      {campoValor("valorIzq", "Izquierdo", false)}
                      {campoValor("valorDer", "Derecho", false)}
                    </>
                  ) : (
                    campoValor("valor", "Valor", true)
                  )}
                  <Campo etiqueta="Unidad" errores={erroresDe("unidad")}>
                    <input value={fila.unidad || "—"} readOnly tabIndex={-1} />
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
            + Agregar test
          </button>
        </div>

        <div className="acciones acciones-formulario">
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
