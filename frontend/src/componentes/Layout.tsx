import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useEtiquetasTablas } from "../hooks/useEtiquetasTablas";
import { linkChatWhatsApp } from "../utils/whatsapp";
import { IconoMensaje, Logo } from "./Iconos";
import { useEsDemo, useSesion } from "./Sesion";

// El editor de rutinas va sin marca de agua: ahí importa solo la planilla.
const ES_EDITOR_RUTINA = /^\/rutinas\/(editar\/\d+|(\d+|sin-alumno)\/nueva)/;

// En las tablas, un clic en cualquier parte de una fila abre su enlace principal (el que tiene la clase
// "enlace-fila", normalmente el nombre). Los otros botones y enlaces de la fila funcionan como siempre.
function abrirFila(evento: MouseEvent) {
  const objetivo = evento.target as HTMLElement;
  if (objetivo.closest("a, button, input, select, label")) return;
  if (window.getSelection()?.toString()) return; // estaba seleccionando texto para copiarlo
  objetivo.closest(".tabla tr")?.querySelector<HTMLAnchorElement>("a.enlace-fila")?.click();
}

// Contacto para quien mira la demo y quiere el sistema.
const LINK_INFO_DEMO = linkChatWhatsApp("3424364254", "Hola Francis, quiero más información sobre DV Training");

// Estructura común de las pantallas internas: encabezado con menú + contenido.
export default function Layout() {
  const { cerrarSesion } = useSesion();
  const esDemo = useEsDemo();
  const { pathname } = useLocation();
  const contenido = useRef<HTMLElement>(null);
  const [menuAbierto, setMenuAbierto] = useState(false); // solo en pantallas angostas
  useEtiquetasTablas(contenido);

  useEffect(() => setMenuAbierto(false), [pathname]);

  // Con el panel del menú abierto (celular): la página de atrás no se desliza y Esc lo cierra.
  useEffect(() => {
    if (!menuAbierto) return;
    const cerrarConEsc = (evento: KeyboardEvent) => evento.key === "Escape" && setMenuAbierto(false);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", cerrarConEsc);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", cerrarConEsc);
    };
  }, [menuAbierto]);

  // En la demo los botones se ven todos (para mostrar el sistema completo), pero los marcados con
  // data-no-en-demo (WhatsApp, descargas, cambios de la cuenta) no hacen nada: muestran un aviso.
  const [avisoDemo, setAvisoDemo] = useState(false);
  useEffect(() => {
    if (!esDemo) return;
    let temporizador: number | undefined;
    function frenar(evento: Event) {
      if (!(evento.target instanceof Element) || !evento.target.closest("[data-no-en-demo]")) return;
      evento.preventDefault();
      evento.stopPropagation();
      setAvisoDemo(true);
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => setAvisoDemo(false), 3000);
    }
    document.addEventListener("click", frenar, true); // en captura: antes que el onClick del botón
    return () => {
      document.removeEventListener("click", frenar, true);
      window.clearTimeout(temporizador);
    };
  }, [esDemo]);

  return (
    <>
      {!ES_EDITOR_RUTINA.test(pathname) && (
        <div className="marca-agua" aria-hidden="true">
          <Logo />
          <span>DV Training</span>
        </div>
      )}
      {/* En la demo, siempre a la vista: que nadie crea que está en un sistema real. */}
      {esDemo && (
        <div className="franja-demo" role="status">
          <strong>Modo demo</strong> · Datos ficticios, solo lectura: los cambios no se guardan.
        </div>
      )}
      <header className="encabezado">
        <div className={`encabezado-contenido${menuAbierto ? " menu-abierto" : ""}`}>
          <Link to="/" className="marca">
            <Logo />
            DV Training
          </Link>
          <button
            type="button"
            className="boton-secundario boton-menu"
            aria-expanded={menuAbierto}
            aria-controls="panel-menu"
            onClick={() => setMenuAbierto(true)}
          >
            Menú
          </button>
          {/* En la compu el panel no existe como caja (display: contents) y el menú va en la barra. En el celular
              es un panel que entra desde la derecha, con las secciones abajo, al alcance del pulgar. */}
          <div className="panel-menu" id="panel-menu">
            <button type="button" className="boton-secundario boton-cerrar-menu" onClick={() => setMenuAbierto(false)}>
              Cerrar ✕
            </button>
            <nav className="menu">
              <NavLink to="/alumnos">Alumnos</NavLink>
              <NavLink to="/membresias">Membresías</NavLink>
              <NavLink to="/rutinas">Rutinas</NavLink>
              <NavLink to="/evaluaciones">Evaluaciones</NavLink>
              <NavLink to="/asistencias">Asistencias</NavLink>
            </nav>
            <div className="encabezado-usuario">
              <nav className="menu">
                <NavLink to="/configuracion">
                  Configuración
                </NavLink>
              </nav>
              <button type="button" className="boton-secundario" onClick={() => cerrarSesion()}>
                {esDemo ? "Salir de la demo" : "Cerrar sesión"}
              </button>
            </div>
          </div>
        </div>
      </header>
      {menuAbierto && <div className="fondo-menu" aria-hidden="true" onClick={() => setMenuAbierto(false)} />}
      <main className={`contenedor${esDemo ? " con-boton-info" : ""}`} ref={contenido} onClick={abrirFila}>
        <Outlet />
      </main>
      {esDemo && (
        <a className="boton-info-demo" href={LINK_INFO_DEMO} target="_blank" rel="noopener noreferrer">
          <IconoMensaje />
          Quiero más información sobre este Software
        </a>
      )}
      {avisoDemo && (
        <div className="aviso-demo" role="status">
          Es una demo: esta función no está disponible.
        </div>
      )}
    </>
  );
}
