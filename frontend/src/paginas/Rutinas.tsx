import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { rutinasApi } from "../api/rutinas";
import BotonVerTodos from "../componentes/BotonVerTodos";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { coincideBusqueda, formatearFecha } from "../utils/formato";

// Lista de alumnos activos: al entrar a uno se ven sus rutinas y se crea una nueva.
// Con ?nueva=1 (botón "Nueva Rutina" de Inicio), al elegir el alumno ya se ofrecen los modelos.
export default function Rutinas() {
  const { datos: alumnos, error } = useCarga(() => rutinasApi.alumnos(), []);
  const [buscar, setBuscar] = useState("");
  const nueva = useSearchParams()[0].has("nueva");

  const visibles = alumnos?.filter((a) => coincideBusqueda(`${a.nombre} ${a.apellido}`, buscar)) ?? [];

  const lista = useListaCorta(visibles, 10);

  return (
    <section>
      <div className="pagina-encabezado">
        <div>
          <h1>{nueva ? "Nueva rutina" : "Rutinas"}</h1>
          <p className="texto-suave">
            {nueva ? "Seleccioná el alumno para el que vas a hacer la rutina." : "Seleccioná un alumno para ver sus rutinas o hacer una nueva."}
          </p>
        </div>
        {!nueva && (
          <Link to="/rutinas?nueva=1" className="boton">
            Nueva Rutina
          </Link>
        )}
      </div>

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
                  <th className="numero">Rutinas</th>
                  <th>Última rutina</th>
                </tr>
              </thead>
              <tbody>
                {lista.visibles.map((alumno) => (
                  <tr key={alumno.id}>
                    <td>
                      <Link to={`/rutinas/${alumno.id}${nueva ? "?nueva=1" : ""}`}>
                        {alumno.apellido}, {alumno.nombre}
                      </Link>
                    </td>
                    <td className="numero">{alumno.cantidad}</td>
                    <td className="sin-salto">
                      {alumno.ultimaRutina ? formatearFecha(alumno.ultimaRutina) : <span className="texto-suave">—</span>}
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
