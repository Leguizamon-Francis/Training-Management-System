import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { panelApi, type FilaPanel, type Panel } from "../api/panel";
import AlumnoDestacado from "../componentes/AlumnoDestacado";
import Cargando from "../componentes/Cargando";
import { IconoAlumnos, IconoCuota, IconoEvaluacion, IconoRutina } from "../componentes/Iconos";
import { useSesion } from "../componentes/Sesion";
import { useCarga } from "../hooks/useCarga";
import { formatearFecha, hoyComoTexto, nombreDelMes } from "../utils/formato";

type ListaPanel = "cuotasPorVencer" | "evaluacionesProximas" | "rutinasPorCambiar";

// Las tarjetas que abren una lista: cada nombre lleva a la pantalla donde se resuelve.
const LISTAS: { clave: ListaPanel; etiqueta: string; icono: ReactNode; textoFecha: string; vacio: string; ruta: (id: number) => string }[] = [
  {
    clave: "cuotasPorVencer",
    etiqueta: "Cuotas por vencer (7 días)",
    icono: <IconoCuota />,
    textoFecha: "Vence el",
    vacio: "No hay cuotas por vencer.",
    ruta: (id) => `/pagos/alumnos/${id}`,
  },
  {
    clave: "evaluacionesProximas",
    etiqueta: "Próximas evaluaciones (7 días)",
    icono: <IconoEvaluacion />,
    textoFecha: "Evaluar el",
    vacio: "No hay evaluaciones próximas.",
    ruta: (id) => `/alumnos/${id}/evaluaciones`,
  },
  {
    clave: "rutinasPorCambiar",
    etiqueta: "Rutinas por cambiar (7 días)",
    icono: <IconoRutina />,
    textoFecha: "Rutina hasta el",
    vacio: "No hay rutinas por cambiar.",
    ruta: (id) => `/rutinas/${id}`,
  },
];

function ListaAlumnos({ filas, lista }: { filas: FilaPanel[]; lista: (typeof LISTAS)[number] }) {
  return (
    <div className="tarjeta seccion">
      <h2>{lista.etiqueta}</h2>
      {filas.length === 0 ? (
        <p className="texto-suave">{lista.vacio}</p>
      ) : (
        <ul className="lista-panel">
          {filas.map((fila) => (
            <li key={fila.id}>
              <Link to={lista.ruta(fila.id)}>
                {fila.apellido}, {fila.nombre}
              </Link>
              <span className="texto-suave">
                {lista.textoFecha} {formatearFecha(fila.fecha)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Indicadores({ panel }: { panel: Panel }) {
  const [abierta, setAbierta] = useState<ListaPanel | null>(null);
  const listaAbierta = LISTAS.find((lista) => lista.clave === abierta);

  return (
    <>
      <div className="indicadores">
        <Link to="/alumnos" className="tarjeta indicador">
          <IconoAlumnos />
          <span className="indicador-etiqueta">Alumnos activos</span>
          <strong className="indicador-valor">{panel.alumnosActivos}</strong>
        </Link>
        {LISTAS.map(({ clave, etiqueta, icono }) => (
          <button
            key={clave}
            type="button"
            className={`tarjeta indicador${abierta === clave ? " activo" : ""}`}
            aria-expanded={abierta === clave}
            onClick={() => setAbierta(abierta === clave ? null : clave)}
          >
            {icono}
            <span className="indicador-etiqueta">{etiqueta}</span>
            <strong className="indicador-valor">{panel[clave].length}</strong>
          </button>
        ))}
      </div>
      {listaAbierta && <ListaAlumnos filas={panel[listaAbierta.clave]} lista={listaAbierta} />}
      {panel.destacadoMes && <AlumnoDestacado periodo={nombreDelMes(hoyComoTexto().slice(0, 7))} destacado={panel.destacadoMes} />}
      {panel.destacadoAnio && <AlumnoDestacado periodo={`año ${hoyComoTexto().slice(0, 4)}`} destacado={panel.destacadoAnio} />}
    </>
  );
}

// Pantalla de Inicio: los números importantes del día de un vistazo y quiénes son.
export default function Inicio() {
  const { usuario } = useSesion();
  const { datos: panel, error } = useCarga(() => panelApi.obtener(), []);

  const hoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section>
      <div className="saludo-inicio">
        <h1>Hola, {usuario?.nombre}</h1>
        <p className="texto-suave primera-mayuscula">{hoy}</p>
      </div>

      <div className="acciones acciones-inicio">
        <Link to="/asistencias/registrar" className="boton">
          Registrar asistencia
        </Link>
        <Link to="/alumnos/nuevo" className="boton">
          Nuevo Alumno
        </Link>
        <Link to="/rutinas?nueva=1" className="boton">
          Nueva Rutina
        </Link>
      </div>

      {panel ? <Indicadores panel={panel} /> : <Cargando error={error} />}
    </section>
  );
}
