type Tema = "claro" | "oscuro";

const CLAVE = "tema";

// Por defecto, modo oscuro; el claro se elige en Configuración. La elección se guarda en este navegador
// (si no se puede leer, ej.: navegación privada, queda el oscuro).
// public/tema-inicial.js aplica el tema guardado antes de dibujar la página, para que no parpadee en claro.
export function leerTema(): Tema {
  try {
    return localStorage.getItem(CLAVE) === "claro" ? "claro" : "oscuro";
  } catch {
    return "oscuro";
  }
}

export function aplicarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema;
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    // Sin almacenamiento, el tema vale hasta que se recargue la página.
  }
}
