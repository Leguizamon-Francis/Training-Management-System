export type Tema = "claro" | "oscuro";

const CLAVE = "tema";

// La elección se guarda en este navegador. Si no se puede leer (ej.: navegación privada), queda el tema claro.
// public/tema-inicial.js aplica el tema guardado antes de dibujar la página, para que no parpadee en claro.
export function leerTema(): Tema {
  try {
    return localStorage.getItem(CLAVE) === "oscuro" ? "oscuro" : "claro";
  } catch {
    return "claro";
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
