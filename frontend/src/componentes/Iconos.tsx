import type { ReactNode } from "react";

// Íconos dibujados acá mismo (SVG), para no sumar una librería. Toman el color del texto.
function Icono({ children }: { children: ReactNode }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function IconoAlumnos() {
  return (
    <Icono>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2" />
    </Icono>
  );
}

export function IconoCuota() {
  return (
    <Icono>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18M7 15h3" />
    </Icono>
  );
}

export function IconoEvaluacion() {
  return (
    <Icono>
      <path d="M4 4v16h16" />
      <path d="m8 15 3.5-4 3 2.5L20 7" />
    </Icono>
  );
}

export function IconoRutina() {
  return (
    <Icono>
      <path d="M8 8v8M16 8v8M8 12h8" />
      <path d="M5 9.5v5M19 9.5v5M2.5 12H5M19 12h2.5" />
    </Icono>
  );
}

// Globo de chat, para el aviso por WhatsApp.
export function IconoMensaje() {
  return (
    <Icono>
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.2A8.5 8.5 0 1 1 20.5 11.5Z" />
      <path d="M8.5 10.5h7M8.5 13.5h4" />
    </Icono>
  );
}

// Logo de DV Training (el mismo dibujo que frontend/public/favicon.svg). El fondo
// cambia con el tema: en oscuro el cuadrado es blanco.
export function Logo() {
  return (
    <svg className="logo" viewBox="100 100 600 600" aria-hidden="true">
      <rect className="logo-fondo" x="100" y="100" width="600" height="600" rx="130" />
      <path className="logo-flecha" d="M210 520l118-110 92 58 158-160M492 298l93 5-5 97" fill="none" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
