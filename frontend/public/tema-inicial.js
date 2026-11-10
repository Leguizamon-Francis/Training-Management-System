// Aplica el tema antes de dibujar la página, para que no parpadee (ver src/utils/tema.ts): oscuro, salvo que en
// este navegador se haya elegido el claro. Es un archivo aparte porque la política de seguridad del servidor no
// permite scripts dentro del HTML.
(function () {
  var tema = "oscuro";
  try {
    if (localStorage.getItem("tema") === "claro") tema = "claro";
  } catch (error) {
    // Sin acceso al almacenamiento queda el oscuro.
  }
  document.documentElement.dataset.tema = tema;
})();
