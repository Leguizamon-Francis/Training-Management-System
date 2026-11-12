import { Link } from "react-router";
import { evaluacionesApi } from "../api/evaluaciones";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { armarGraficos, formatearNumero, nombreConLado } from "../utils/evaluaciones";
import Variacion from "./Variacion";
import { formatearFecha } from "../utils/formato";
import BotonVerTodos from "./BotonVerTodos";
import Cargando from "./Cargando";
import Desplegable from "./Desplegable";
import ProximaEvaluacion from "./ProximaEvaluacion";

// Resumen de evaluaciones dentro de la ficha: próxima evaluación y último valor de cada prueba
// comparado con la medición anterior. El historial completo está en /evaluaciones/alumnos/:id.
export default function EvaluacionesAlumno({ alumnoId }: { alumnoId: number }) {
  const { datos, error } = useCarga(() => evaluacionesApi.listar(alumnoId), [alumnoId]);

  // Una fila por prueba (y lado); primero las medidas más recientemente.
  const filas = armarGraficos(datos?.evaluaciones ?? [])
    .flatMap((grafico) =>
      grafico.series.map((serie) => ({
        clave: `${grafico.pruebaId}-${serie.lado ?? ""}`,
        nombre: nombreConLado(grafico.nombre, serie.lado),
        unidad: grafico.unidad,
        ultimo: serie.puntos[serie.puntos.length - 1],
        anterior: serie.puntos.at(-2),
      })),
    )
    .sort((a, b) => b.ultimo.fecha.localeCompare(a.ultimo.fecha) || b.ultimo.numero - a.ultimo.numero);
  const lista = useListaCorta(filas, 4);
  const cantidad = datos?.evaluaciones.length ?? 0;

  return (
    <Desplegable titulo="Evaluaciones">
      <div className="pagina-encabezado">
        <div className="acciones">
          <Link to={`/evaluaciones/alumnos/${alumnoId}/nueva`} className="boton">
            Nueva evaluación
          </Link>
          {cantidad > 0 && (
            <Link to={`/evaluaciones/alumnos/${alumnoId}`} className="boton-secundario">
              Historial y métricas ({cantidad})
            </Link>
          )}
        </div>
      </div>

      {!datos ? (
        <Cargando error={error} />
      ) : (
        <>
          <ProximaEvaluacion datos={datos.proximaEvaluacion} />

          {cantidad === 0 ? (
            <p className="texto-suave">Todavía no tiene evaluaciones.</p>
          ) : (
            <>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Prueba</th>
                      <th>Último valor</th>
                      <th>Anterior</th>
                      <th>Variación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.visibles.map(({ clave, nombre, unidad, ultimo, anterior }) => (
                      <tr key={clave}>
                        <td>{nombre}</td>
                        <td className="sin-salto">
                          <strong>
                            {formatearNumero(ultimo.valor)} {unidad}
                          </strong>{" "}
                          <span className="texto-suave">{formatearFecha(ultimo.fecha)}</span>
                        </td>
                        <td className="sin-salto">
                          {anterior ? (
                            <>
                              {formatearNumero(anterior.valor)}{" "}
                              <span className="texto-suave">{formatearFecha(anterior.fecha)}</span>
                            </>
                          ) : (
                            <span className="texto-suave">—</span>
                          )}
                        </td>
                        <td className="sin-salto">
                          {anterior ? (
                            <Variacion anterior={anterior.valor} actual={ultimo.valor} unidad={unidad} />
                          ) : (
                            <span className="texto-suave">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <BotonVerTodos lista={lista} femenino />
            </>
          )}
        </>
      )}
    </Desplegable>
  );
}
