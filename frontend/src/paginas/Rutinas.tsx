import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { rutinasApi, type Rutina } from "../api/rutinas";
import BotonVerTodos from "../componentes/BotonVerTodos";
import Desplegable from "../componentes/Desplegable";
import ListaRutinas from "../componentes/ListaRutinas";
import { useCarga } from "../hooks/useCarga";
import { ALUMNOS_POR_LISTA, useListaCorta } from "../hooks/useListaCorta";
import { coincideBusqueda, formatearFecha, formatearFechaHora } from "../utils/formato";
import { ETIQUETAS_TIPO_BLOQUE, MODELOS_RUTINA } from "../utils/rutinas";
import { useConfirmar } from "../componentes/Confirmar";
import { Flecha } from "../componentes/Iconos";

// Lista de alumnos activos: al entrar a uno se ven sus rutinas y se crea una nueva. Abajo, las rutinas sin alumno.
// Con ?nueva=1 (botón "Nueva rutina"), al elegir el alumno ya se ofrecen los modelos; también se puede armar
// una sin alumno con el botón "Rutina sin datos de alumno".
export default function Rutinas() {
  const confirmar = useConfirmar();
  const { datos: alumnos, error } = useCarga(() => rutinasApi.alumnos(), []);
  const { datos: sueltas, error: errorSueltas, setError: setErrorSueltas, recargar } = useCarga(() => rutinasApi.sueltas(), []);
  const [buscar, setBuscar] = useState("");
  const nueva = useSearchParams()[0].has("nueva");
  const [sinAlumno, setSinAlumno] = useState(false); // eligiendo el modelo de una rutina sin alumno
  const origen = useLocation().state;
  const desdeInicio = origen?.desde === "inicio";
  const navigate = useNavigate();

  const visibles = alumnos?.filter((a) => coincideBusqueda(`${a.nombre} ${a.apellido}`, buscar)) ?? [];

  const lista = useListaCorta(visibles, ALUMNOS_POR_LISTA);
  const listaSueltas = useListaCorta(sueltas ?? [], 3);

  async function eliminar(rutina: Rutina) {
    const fecha = formatearFechaHora(rutina.creadoEn).slice(0, 10);
    const si = await confirmar({
      titulo: "¿Eliminar la rutina?",
      mensaje: `Rutina creada el ${fecha}. No se puede deshacer.`,
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!si) return;
    try {
      await rutinasApi.eliminar(rutina.id);
      await recargar();
    } catch (err) {
      setErrorSueltas(err instanceof Error ? err.message : "No se pudo eliminar la rutina");
    }
  }

  return (
    <section>
      {desdeInicio && (
        <Link to="/" className="volver">
          <Flecha hacia="atras" />
          Inicio
        </Link>
      )}
      <h1>{nueva ? "Nueva rutina" : "Rutinas"}</h1>
      <p className="texto-suave">
        {nueva ? "Seleccioná el alumno para el que vas a hacer la rutina." : "Seleccioná un alumno para ver sus rutinas o hacer una nueva."}
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
                  <th className="numero">Rutinas</th>
                  <th>Última rutina</th>
                </tr>
              </thead>
              <tbody>
                {lista.visibles.map((alumno) => (
                  <tr key={alumno.id}>
                    <td>
                      <Link to={`/rutinas/${alumno.id}${nueva ? "?nueva=1" : ""}`} state={desdeInicio ? { desde: "inicio" } : undefined} className="enlace-fila">
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

      {/* Debajo de la lista. Con "Rutina sin datos de alumno", la elección del modelo se abre acá mismo. */}
      {!sinAlumno && (
        <div className="pie-lista acciones">
          {nueva ? (
            <>
              {/* Sin confirmación: todavía no se cargó nada. Vuelve a donde se tocó "Nueva rutina". */}
              <Link to={desdeInicio ? "/" : "/rutinas"} className="boton-secundario">
                Cancelar
              </Link>
              <button type="button" className="boton-secundario" onClick={() => setSinAlumno(true)}>
                Rutina sin datos de alumno
              </button>
            </>
          ) : (
            <Link to="/rutinas?nueva=1" className="boton">
              Nueva rutina
            </Link>
          )}
        </div>
      )}

      {sinAlumno && (
        <div className="tarjeta seccion">
          <h2>Rutina sin datos de alumno</h2>
          <p className="texto-suave">Elegí el modelo. La rutina queda guardada en "Rutinas sin alumno".</p>
          <div className="opciones-bloque">
            {MODELOS_RUTINA.map((tipo) => (
              <button
                key={tipo}
                type="button"
                className="opcion-bloque"
                onClick={() => navigate(`/rutinas/sin-alumno/nueva?tipo=${tipo}`, { state: origen })}
              >
                {ETIQUETAS_TIPO_BLOQUE[tipo]}
              </button>
            ))}
          </div>
          <button type="button" className="boton-secundario" onClick={() => setSinAlumno(false)}>
            Cancelar
          </button>
        </div>
      )}

      {!nueva && sueltas && sueltas.length > 0 && (
        <Desplegable titulo={`Rutinas sin alumno (${sueltas.length})`}>
          {errorSueltas && <p className="mensaje-error">{errorSueltas}</p>}
          <ListaRutinas rutinas={listaSueltas.visibles} alumno={null} onEliminar={eliminar} />
          <BotonVerTodos lista={listaSueltas} femenino textoCerrar="Ver menos" />
        </Desplegable>
      )}
    </section>
  );
}
