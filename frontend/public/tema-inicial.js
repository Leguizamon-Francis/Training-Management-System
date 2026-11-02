// Aplica el tema guardado antes de dibujar la página, para que no parpadee en claro (ver src/utils/tema.ts).
// Es un archivo aparte porque la política de seguridad del servidor no permite scripts dentro del HTML.
try {
  if (localStorage.getItem("tema") === "oscuro") document.documentElement.dataset.tema = "oscuro";
} catch (error) {
  // Sin acceso al almacenamiento queda el tema claro.
}
