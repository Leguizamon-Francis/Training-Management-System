import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { panelApi, type FilaPanel, type Panel } from "../api/panel";
import AlumnoDestacado from "../componentes/AlumnoDestacado";
import Cargando from "../componentes/Cargando";
import { IconoAlumnos, IconoCuota, IconoCumple, IconoEvaluacion, IconoRutina } from "../componentes/Iconos";
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
    ruta: (id) => `/membresias/alumnos/${id}`,
  },
  {
    clave: "evaluacionesProximas",
    etiqueta: "Próximas evaluaciones (7 días)",
    icono: <IconoEvaluacion />,
    textoFecha: "Evaluar el",
    vacio: "No hay evaluaciones próximas.",
    ruta: (id) => `/evaluaciones/alumnos/${id}`,
  },
  {
    clave: "rutinasPorCambiar",
    etiqueta: "Rutinas por cambiar (7 días)",
    icono: <IconoRutina />,
    textoFecha: "Hasta el",
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

// Cumpleaños de lunes a domingo: el nombre lleva a la ficha; el de hoy se destaca.
function Cumpleanios({ alumnos }: { alumnos: Panel["cumpleanios"] }) {
  const hoy = hoyComoTexto();
  return (
    <div className="tarjeta seccion">
      <h2 className="titulo-con-icono">
        <IconoCumple />
        Cumplen años esta semana
      </h2>
      {alumnos.length === 0 ? (
        <p className="texto-suave">Nadie cumple años esta semana.</p>
      ) : (
        <ul className="lista-panel">
          {alumnos.map((alumno) => (
            <li key={alumno.id}>
              <Link to={`/alumnos/${alumno.id}`}>
                {alumno.apellido}, {alumno.nombre}
              </Link>
              <span className={alumno.fecha === hoy ? "cumple-hoy" : "texto-suave"}>
                {alumno.fecha === hoy ? "¡Hoy!" : diaDeLaSemana(alumno.fecha)}{" "}
                {formatearFecha(alumno.fecha)} · cumple {alumno.edad} {alumno.edad === 1 ? "año" : "años"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// "Jueves" (con mayúscula: el navegador lo da en minúscula).
function diaDeLaSemana(fecha: string) {
  const dia = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long" });
  return dia.charAt(0).toUpperCase() + dia.slice(1);
}

function Indicadores({ panel }: { panel: Panel }) {
  const [abierta, setAbierta] = useState<ListaPanel | null>(null);
  const listaAbierta = LISTAS.find((lista) => lista.clave === abierta);

  return (
    <>
      <div className="indicadores">
        <Link to="/alumnos" state={{ desde: "inicio" }} className="tarjeta indicador">
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
      <Cumpleanios alumnos={panel.cumpleanios} />
      {panel.destacadoMes && <AlumnoDestacado periodo={nombreDelMes(hoyComoTexto().slice(0, 7))} destacado={panel.destacadoMes} />}
      {panel.destacadoAnio && <AlumnoDestacado periodo={`año ${hoyComoTexto().slice(0, 4)}`} destacado={panel.destacadoAnio} />}
    </>
  );
}

// Pantalla de Inicio: arriba los números del día (cada tarjeta muestra quiénes son) y abajo los accesos rápidos.
export default function Inicio() {
  const { usuario } = useSesion();
  const { datos: panel, error } = useCarga(() => panelApi.obtener(), []);

  const hoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section>
      <div className="cabecera-inicio">
        <h1>Hola, {usuario?.nombre}</h1>
        <p className="texto-suave primera-mayuscula">{hoy}</p>
      </div>

      {panel ? <Indicadores panel={panel} /> : <Cargando error={error} />}

      <div className="accesos-inicio">
        <Link to="/alumnos/nuevo" state={{ desde: "inicio" }} className="boton boton-inicio boton-alumno">
          Nuevo alumno
        </Link>
        <Link to="/asistencias/registrar" state={{ desde: "inicio" }} className="boton boton-inicio boton-asistencia">
          Registrar asistencia
        </Link>
        <Link to="/rutinas?nueva=1" state={{ desde: "inicio" }} className="boton boton-inicio boton-rutina">
          Nueva rutina
        </Link>
      </div>
    </section>
  );
}
