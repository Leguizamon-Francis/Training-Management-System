import { useState } from "react";
import { Link } from "react-router";
import { asistenciasApi } from "../api/asistencias";
import BotonVerTodos from "../componentes/BotonVerTodos";
import Cargando from "../componentes/Cargando";
import { useCarga } from "../hooks/useCarga";
import { ALUMNOS_POR_LISTA, useListaCorta } from "../hooks/useListaCorta";
import { coincideBusqueda, formatearFecha, hoyComoTexto, nombreDelMes, sumarMeses } from "../utils/formato";

// "aaaa-mm" más o menos meses.
function moverMes(mes: string, cantidad: number) {
  return sumarMeses(`${mes}-01`, cantidad).slice(0, 7);
}

// Cuántos alumnos muestra "Alumnos con más asistencias".
const CANTIDAD_MAS_ASISTENCIAS = 3;

// Reportes de asistencia de un mes y lista de alumnos: al entrar a uno se ve su historial.
export default function Asistencias() {
  const mesActual = hoyComoTexto().slice(0, 7);
  const [mes, setMes] = useState(mesActual);
  const [buscar, setBuscar] = useState("");
  const [abierto, setAbierto] = useState<"hoy" | "masAsistencias" | null>(null); // un cuadro abierto a la vez
  const { datos: resumen, error } = useCarga(() => asistenciasApi.resumen(mes), [mes]);
  // "Asistencias de hoy" no depende del mes elegido: siempre es el día de hoy.
  const { datos: vinieronHoy } = useCarga(
    () => asistenciasApi.dia(hoyComoTexto()).then((alumnos) => alumnos.filter((alumno) => alumno.presente)),
    [],
  );

  const visibles = resumen?.alumnos.filter((a) => coincideBusqueda(`${a.nombre} ${a.apellido}`, buscar)) ?? [];

  const lista = useListaCorta(visibles, ALUMNOS_POR_LISTA);
  // El resumen ya viene ordenado de más a menos asistencias en el mes elegido.
  const masAsistencias = resumen?.alumnos.filter((alumno) => alumno.cantidad > 0).slice(0, CANTIDAD_MAS_ASISTENCIAS) ?? [];

  const alternar = (cuadro: "hoy" | "masAsistencias") => setAbierto(abierto === cuadro ? null : cuadro);

  return (
    <section>
      <h1>Asistencias</h1>
      <p className="texto-suave primera-mayuscula">{nombreDelMes(mes)}</p>

      {!resumen ? (
        <Cargando error={error} />
      ) : (
        <>
          <div className="indicadores indicadores-compactos">
            <button
              type="button"
              className={`tarjeta indicador${abierto === "hoy" ? " activo" : ""}`}
              aria-expanded={abierto === "hoy"}
              onClick={() => alternar("hoy")}
            >
              <span className="indicador-etiqueta">Asistencias de hoy</span>
              <strong className="indicador-valor">{vinieronHoy?.length ?? "…"}</strong>
            </button>
            {/* El ranking es del mes elegido abajo; el cuadro muestra al primero. */}
            <button
              type="button"
              className={`tarjeta indicador${abierto === "masAsistencias" ? " activo" : ""}`}
              aria-expanded={abierto === "masAsistencias"}
              onClick={() => alternar("masAsistencias")}
            >
              <span className="indicador-etiqueta">Alumnos con más asistencias</span>
              <strong className="indicador-valor indicador-valor-texto">
                {masAsistencias[0] ? `${masAsistencias[0].apellido}, ${masAsistencias[0].nombre}` : "—"}
              </strong>
            </button>
          </div>

          {abierto === "masAsistencias" && (
            <div className="tarjeta seccion">
              <h2 className="primera-mayuscula">Más asistencias en {nombreDelMes(mes)}</h2>
              {masAsistencias.length === 0 ? (
                <p className="texto-suave">Todavía no hay asistencias en este mes.</p>
              ) : (
                <ul className="lista-panel">
                  {masAsistencias.map((alumno) => (
                    <li key={alumno.id}>
                      <Link to={`/asistencias/${alumno.id}`}>
                        {alumno.apellido}, {alumno.nombre}
                      </Link>
                      <span className="texto-suave">
                        {alumno.cantidad} {alumno.cantidad === 1 ? "asistencia" : "asistencias"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {abierto === "hoy" && vinieronHoy && (
            <div className="tarjeta seccion">
              <h2>Vinieron hoy</h2>
              {vinieronHoy.length === 0 ? (
                <p className="texto-suave">Todavía no se registró ninguna asistencia hoy.</p>
              ) : (
                <ul className="lista-panel">
                  {vinieronHoy.map((alumno) => (
                    <li key={alumno.id}>
                      <Link to={`/asistencias/${alumno.id}`}>
                        {alumno.apellido}, {alumno.nombre}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
            {/* Flechas en lugar de <input type="month">: ese campo lo dibuja cada navegador (Safari lo muestra en el
                idioma del teléfono y más ancho que la pantalla). No se puede pasar del mes actual. */}
            <div className="selector-mes" role="group" aria-label="Mes del reporte">
              <button type="button" className="boton-secundario" onClick={() => setMes(moverMes(mes, -1))} aria-label="Mes anterior">
                ‹
              </button>
              <span className="primera-mayuscula" aria-live="polite">
                {nombreDelMes(mes)}
              </span>
              <button
                type="button"
                className="boton-secundario"
                onClick={() => setMes(moverMes(mes, 1))}
                disabled={mes >= mesActual}
                aria-label="Mes siguiente"
              >
                ›
              </button>
            </div>
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
                        <Link to={`/asistencias/${alumno.id}`} className="enlace-fila">
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

          <div className="pie-lista">
            <Link to="/asistencias/registrar" className="boton">
              Registrar asistencia
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
