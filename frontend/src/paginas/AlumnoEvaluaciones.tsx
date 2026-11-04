import { Link, useParams } from "react-router";
import { alumnosApi } from "../api/alumnos";
import { evaluacionesApi } from "../api/evaluaciones";
import BotonVerTodos from "../componentes/BotonVerTodos";
import Cargando from "../componentes/Cargando";
import GraficoEvolucion from "../componentes/GraficoEvolucion";
import ProximaEvaluacion from "../componentes/ProximaEvaluacion";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { armarGraficos } from "../utils/evaluaciones";
import { formatearFecha } from "../utils/formato";

// Evaluaciones de un alumno: gráficos de evolución por prueba y lista de evaluaciones realizadas.
export default function AlumnoEvaluaciones() {
  const alumnoId = Number(useParams().id);
  const { datos, error } = useCarga(
    () => Promise.all([alumnosApi.obtener(alumnoId), evaluacionesApi.listar(alumnoId)]),
    [alumnoId],
  );
  // La lista viene de la más reciente a la más vieja.
  const lista = useListaCorta(datos?.[1].evaluaciones ?? [], 4);

  if (!datos) return <Cargando error={error} />;

  const [alumno, { evaluaciones, proximaEvaluacion }] = datos;

  return (
    <section>
      <Link to="/evaluaciones" className="volver">
        ← Evaluaciones
      </Link>

      <div className="pagina-encabezado">
        <div>
          <h1>
            {alumno.apellido}, {alumno.nombre}
          </h1>
          <Link to={`/alumnos/${alumnoId}`}>Ver ficha del alumno</Link>
        </div>
        <Link to={`/evaluaciones/alumnos/${alumnoId}/nueva`} className="boton">
          Nueva evaluación
        </Link>
      </div>

      <ProximaEvaluacion datos={proximaEvaluacion} discreta />

      {evaluaciones.length === 0 ? (
        <p className="texto-suave">Todavía no tiene evaluaciones.</p>
      ) : (
        <>
          <div className="titulo-evolucion">
            <h2>Evolución</h2>
            <p className="texto-suave texto-chico solo-ancho">Pasá el mouse sobre un punto para ver su fecha y valor.</p>
          </div>
          <div className="graficos">
            {armarGraficos(evaluaciones).map((grafico) => (
              <GraficoEvolucion key={grafico.pruebaId} datos={grafico} />
            ))}
          </div>

          <div className="tarjeta seccion">
            <h2>Evaluaciones realizadas</h2>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Fecha</th>
                    <th className="numero">Resultados</th>
                    <th>Observaciones</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lista.visibles.map((evaluacion) => (
                    <tr key={evaluacion.id}>
                      <td className="sin-salto">
                        <Link to={`/evaluaciones/${evaluacion.id}`}>{evaluacion.idEvaluacion}</Link>
                      </td>
                      <td className="sin-salto">{formatearFecha(evaluacion.fecha)}</td>
                      <td className="numero">{evaluacion.resultados.length}</td>
                      <td className="texto-recortado">{evaluacion.observaciones ?? <span className="texto-suave">—</span>}</td>
                      <td className="sin-salto">
                        <Link to={`/evaluaciones/${evaluacion.id}`}>Ver detalle</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <BotonVerTodos lista={lista} femenino />
          </div>
        </>
      )}
    </section>
  );
}
