import { useState } from "react";
import { Link } from "react-router";
import { asistenciasApi } from "../api/asistencias";
import AlumnoDestacado from "../componentes/AlumnoDestacado";
import BotonVerTodos from "../componentes/BotonVerTodos";
import Cargando from "../componentes/Cargando";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { coincideBusqueda, formatearFecha, hoyComoTexto, nombreDelMes } from "../utils/formato";

function Indicador({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="tarjeta indicador">
      <span className="indicador-etiqueta">{etiqueta}</span>
      <strong className="indicador-valor">{valor}</strong>
    </div>
  );
}

// Reportes de asistencia de un mes y lista de alumnos: al entrar a uno se ve su historial.
export default function Asistencias() {
  const mesActual = hoyComoTexto().slice(0, 7);
  const [mes, setMes] = useState(mesActual);
  const [buscar, setBuscar] = useState("");
  const [verDestacados, setVerDestacados] = useState(false);
  const { datos: resumen, error } = useCarga(() => asistenciasApi.resumen(mes), [mes]);

  const visibles = resumen?.alumnos.filter((a) => coincideBusqueda(`${a.nombre} ${a.apellido}`, buscar)) ?? [];

  const lista = useListaCorta(visibles, 10);

  return (
    <section>
      <div className="pagina-encabezado">
        <div>
          <h1>Asistencias</h1>
          <p className="texto-suave primera-mayuscula">{nombreDelMes(mes)}</p>
        </div>
        <div className="acciones">
          <button type="button" className="boton-secundario" aria-expanded={verDestacados} onClick={() => setVerDestacados(!verDestacados)}>
            Alumno con más asistencias
          </button>
          <Link to="/asistencias/registrar" className="boton">
            Registrar asistencia
          </Link>
        </div>
      </div>

      {!resumen ? (
        <Cargando error={error} />
      ) : (
        <>
          <div className="indicadores">
            <Indicador etiqueta="Asistencias del mes" valor={resumen.total} />
            <Indicador etiqueta="Alumnos que vinieron" valor={resumen.alumnosQueVinieron} />
          </div>

          {verDestacados && (
            <>
              <AlumnoDestacado periodo={nombreDelMes(mes)} destacado={resumen.destacadoMes} />
              <AlumnoDestacado periodo={`año ${mes.slice(0, 4)}`} destacado={resumen.destacadoAnio} />
            </>
          )}

          <div className="tarjeta seccion">
            <h2>Sin venir hace más de {resumen.diasAvisoSinVenir} días</h2>
            {resumen.sinVenir.length === 0 ? (
              <p className="texto-suave">No hay alumnos en esta situación.</p>
            ) : (
              <ul className="lista-panel">
                {resumen.sinVenir.map((alumno) => (
                  <li key={alumno.id}>
                    <Link to={`/asistencias/${alumno.id}`}>
                      {alumno.apellido}, {alumno.nombre}
                    </Link>
                    <span className="texto-suave">
                      Hace {alumno.diasSinVenir} días (última: {formatearFecha(alumno.ultimaAsistencia)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="filtros filtros-asistencia">
            <input
              type="search"
              placeholder="Buscar alumno"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              aria-label="Buscar alumno"
            />
            <input
              type="month"
              value={mes}
              max={mesActual}
              onChange={(e) => e.target.value && setMes(e.target.value)}
              aria-label="Mes del reporte"
            />
          </div>

          {error && <p className="mensaje-error">{error}</p>}

          {visibles.length === 0 ? (
            <p className="texto-suave">No hay alumnos que coincidan.</p>
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th className="numero">Asistencias del mes</th>
                    <th className="numero">Por semana</th>
                    <th>Última asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.visibles.map((alumno) => (
                    <tr key={alumno.id}>
                      <td>
                        <Link to={`/asistencias/${alumno.id}`}>
                          {alumno.apellido}, {alumno.nombre}
                        </Link>
                        {!alumno.activo && <span className="texto-suave"> (inactivo)</span>}
                      </td>
                      <td className="numero">{alumno.cantidad}</td>
                      <td className="numero">{alumno.promedioSemanal.toLocaleString("es-AR")}</td>
                      <td className="sin-salto">
                        {alumno.ultimaAsistencia ? formatearFecha(alumno.ultimaAsistencia) : <span className="texto-suave">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <BotonVerTodos lista={lista} textoCerrar="Ver menos" />
            </div>
          )}
        </>
      )}
    </section>
  );
}
