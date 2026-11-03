import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useEtiquetasTablas } from "../hooks/useEtiquetasTablas";
import { Logo } from "./Iconos";
import { useSesion } from "./Sesion";

// El editor de rutinas va sin marca de agua: ahí importa solo la planilla.
const ES_EDITOR_RUTINA = /^\/rutinas\/(editar\/\d+|\d+\/nueva)/;

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
            {/* Ingresos no está en el menú: se abre desde Pagos, que queda resaltado */}
            <NavLink to="/pagos" className={() => (/^\/(pagos|ingresos)/.test(pathname) ? "active" : "")}>
              Pagos
            </NavLink>
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
      <main className="contenedor" ref={contenido}>
        <Outlet />
      </main>
    </>
  );
}
