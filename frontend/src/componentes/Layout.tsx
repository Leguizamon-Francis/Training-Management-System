import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useEtiquetasTablas } from "../hooks/useEtiquetasTablas";
import { Logo } from "./Iconos";
import { useSesion } from "./Sesion";

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

// Estructura común de las pantallas internas: encabezado con menú + contenido.
export default function Layout() {
  const { cerrarSesion } = useSesion();
  const { pathname } = useLocation();
  const contenido = useRef<HTMLElement>(null);
  const [menuAbierto, setMenuAbierto] = useState(false); // solo en pantallas angostas
  useEtiquetasTablas(contenido);

  useEffect(() => setMenuAbierto(false), [pathname]);

  return (
    <>
      {!ES_EDITOR_RUTINA.test(pathname) && (
        <div className="marca-agua" aria-hidden="true">
          <Logo />
          <span>DV Training</span>
        </div>
      )}
      <header className="encabezado">
        <div className={`encabezado-contenido${menuAbierto ? " menu-abierto" : ""}`}>
          <Link to="/" className="marca">
            <Logo />
            DV Training
          </Link>
          <button type="button" className="boton-secundario boton-menu" aria-expanded={menuAbierto} onClick={() => setMenuAbierto(!menuAbierto)}>
            {menuAbierto ? "Cerrar" : "Menú"}
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
              <NavLink to="/configuracion">Configuración</NavLink>
            </nav>
            <button type="button" className="boton-secundario" onClick={() => cerrarSesion()}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="contenedor" ref={contenido} onClick={abrirFila}>
        <Outlet />
      </main>
    </>
  );
}
