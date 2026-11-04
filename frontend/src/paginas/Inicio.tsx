import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
      {panel.destacadoMes && <AlumnoDestacado periodo={nombreDelMes(hoyComoTexto().slice(0, 7))} destacado={panel.destacadoMes} />}
      {panel.destacadoAnio && <AlumnoDestacado periodo={`año ${hoyComoTexto().slice(0, 4)}`} destacado={panel.destacadoAnio} />}
    </>
  );
}

// Distancia entre los botones y el borde de arriba del logo de fondo, en px.
const ESPACIO_SOBRE_LOGO = 8;

// Deja la fila de botones justo encima del logo de fondo. El logo está fijo en el centro de la ventana y su
// altura depende del tamaño de la ventana: por eso se mide. Si sobra lugar, baja los botones; si el botón
// pisaría el logo, baja el logo (solo en Inicio). En el celular no se usa.
function useBotonesSobreLogo(cabecera: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const angosta = window.matchMedia("(max-width: 760px)");
    const raiz = document.documentElement.style;

    function acomodar() {
      const elemento = cabecera.current;
      if (!elemento) return;
      elemento.style.removeProperty("--separacion-filas");
      raiz.removeProperty("--bajar-marca-agua");
      const logo = document.querySelector(".marca-agua .logo");
      const boton = elemento.querySelector(".boton-asistencia");
      if (angosta.matches || !logo || !boton) return;

      const finBotones = boton.getBoundingClientRect().bottom + window.scrollY;
      const inicioLogo = logo.getBoundingClientRect().top; // fijo: no cambia con el desplazamiento
      const sobrante = inicioLogo - ESPACIO_SOBRE_LOGO - finBotones;
      if (sobrante >= 0) {
        const separacion = parseFloat(getComputedStyle(elemento).rowGap) + sobrante;
        elemento.style.setProperty("--separacion-filas", `${separacion}px`);
      } else {
        raiz.setProperty("--bajar-marca-agua", `${-sobrante}px`);
      }
    }

    acomodar();
    window.addEventListener("resize", acomodar);
    angosta.addEventListener("change", acomodar);
    return () => {
      window.removeEventListener("resize", acomodar);
      angosta.removeEventListener("change", acomodar);
      raiz.removeProperty("--bajar-marca-agua");
    };
  }, [cabecera]);
}

// Pantalla de Inicio: los números importantes del día de un vistazo y quiénes son.
export default function Inicio() {
  const { usuario } = useSesion();
  const { datos: panel, error } = useCarga(() => panelApi.obtener(), []);
  const cabecera = useRef<HTMLDivElement>(null);
  useBotonesSobreLogo(cabecera);

  const hoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section>
      <div className="cabecera-inicio" ref={cabecera}>
        <h1>Hola, {usuario?.nombre}</h1>
        <p className="texto-suave primera-mayuscula">{hoy}</p>
        <Link to="/asistencias/registrar" state={{ desde: "inicio" }} className="boton boton-inicio boton-asistencia">
          Registrar Asistencia
        </Link>
        <Link to="/alumnos/nuevo" state={{ desde: "inicio" }} className="boton boton-inicio boton-alumno">
          Nuevo Alumno
        </Link>
        <Link to="/rutinas?nueva=1" state={{ desde: "inicio" }} className="boton boton-inicio boton-rutina">
          Nueva Rutina
        </Link>
      </div>

      {panel ? <Indicadores panel={panel} /> : <Cargando error={error} />}
    </section>
  );
}
