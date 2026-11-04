import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { evaluacionesApi } from "../api/evaluaciones";
import BotonVerTodos from "../componentes/BotonVerTodos";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { ETIQUETAS_PERFIL } from "../utils/alumnos";
import { claseProximaEvaluacion, textoDiasRestantes } from "../utils/evaluaciones";
import { coincideBusqueda, formatearFecha } from "../utils/formato";

// Lista de alumnos activos con el estado de sus evaluaciones.
// Con ?nueva=1 (botón "Nueva Evaluación"), al elegir el alumno se abre el formulario.
export default function Evaluaciones() {
  const { datos: alumnos, error } = useCarga(() => evaluacionesApi.resumenAlumnos(), []);
  const [buscar, setBuscar] = useState("");
  const nueva = useSearchParams()[0].has("nueva");

  const visibles = alumnos?.filter((a) => coincideBusqueda(`${a.nombre} ${a.apellido}`, buscar)) ?? [];

  const lista = useListaCorta(visibles, 10);

  return (
    <section>
      <div className="pagina-encabezado">
        <h1>{nueva ? "Nueva evaluación" : "Evaluaciones"}</h1>
        {!nueva && (
          <div className="acciones">
            <Link to="/evaluaciones/configuracion" className="boton-secundario">
              Configurar evaluaciones
            </Link>
            <Link to="/evaluaciones?nueva=1" className="boton">
              Nueva Evaluación
            </Link>
          </div>
        )}
      </div>
      <p className="texto-suave">
        {nueva ? "Seleccioná el alumno al que vas a evaluar." : "Entrá a un alumno para ver la evolución de sus evaluaciones."}
      </p>

      <div className="filtros filtros-simple">
        <input
          type="search"
          placeholder="Buscar alumno"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          aria-label="Buscar alumno"
        />
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      {alumnos &&
        (visibles.length === 0 ? (
          <p className="texto-suave">No hay alumnos que coincidan.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Perfil</th>
                  <th className="numero">Evaluaciones</th>
                  <th>Última</th>
                  <th>Próxima</th>
                </tr>
              </thead>
              <tbody>
                {lista.visibles.map((alumno) => (
                  <tr key={alumno.id}>
                    <td>
                      <Link to={`/evaluaciones/alumnos/${alumno.id}${nueva ? "/nueva" : ""}`}>
                        {alumno.apellido}, {alumno.nombre}
                      </Link>
                    </td>
                    <td>{ETIQUETAS_PERFIL[alumno.perfil]}</td>
                    <td className="numero">{alumno.cantidad}</td>
                    <td className="sin-salto">
                      {alumno.ultimaEvaluacion ? formatearFecha(alumno.ultimaEvaluacion) : <span className="texto-suave">—</span>}
                    </td>
                    <td className="sin-salto">
                      {formatearFecha(alumno.proximaEvaluacion.fecha)}{" "}
                      <span className={claseProximaEvaluacion(alumno.proximaEvaluacion)}>
                        {textoDiasRestantes(alumno.proximaEvaluacion)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <BotonVerTodos lista={lista} textoCerrar="Ver menos" />
          </div>
        ))}
    </section>
  );
}
