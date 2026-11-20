import { rgb, type PDFFont, type PDFPage } from "pdf-lib";

// "Modelo Rutina 3": una sesión de gimnasio en una hoja A4 horizontal, hecha del Excel "rutina esqueleto".
// Lo usan el generador de la planilla (scripts/generar-plantillas.ts) y el servidor al armar el PDF de cada rutina,
// que completa las cuentas del Excel (volumen, totales, resumen por bloque, progreso) y dibuja el gráfico y la barra
// de progreso. Los campos se llaman como la celda del Excel (B8, C8…); se agregaron nombre, edad y deporte arriba.

export const ANCHO_HOJA = 841.89;
export const ALTO_HOJA = 595.28;
const MARGEN = 20;
const ANCHO_UTIL = ANCHO_HOJA - 2 * MARGEN;

export const AZUL = rgb(0x3c / 255, 0x5e / 255, 0x8f / 255);
export const CELESTE = rgb(0xd9 / 255, 0xe3 / 255, 0xf7 / 255);
export const RAYADO = rgb(0xf9 / 255, 0xf9 / 255, 0xff / 255);

export const TITULO = "Prototipo de Rutina de Gimnasio";
export const BLOQUES = ["Entrada en calor", "Bloque de potencia", "Bloque principal", "Accesorios"];
// Filas de ejercicios del Excel (8 a 20) con el bloque que traen de entrada.
export const EJERCICIOS = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3].map((bloque, i) => ({ fila: 8 + i, bloque: BLOQUES[bloque] }));
export const FILAS_RESUMEN = BLOQUES.map((bloque, i) => ({ fila: 23 + i, bloque }));

// Columnas de la tabla de ejercicios (letra del Excel, título y ancho relativo).
export const COLUMNAS = [
  { letra: "B", titulo: "Bloque", ancho: 22 },
  { letra: "C", titulo: "Ejercicio", ancho: 38 },
  { letra: "D", titulo: "Series", ancho: 9 },
  { letra: "E", titulo: "Repeticiones", ancho: 12 },
  { letra: "F", titulo: "Peso (kg)", ancho: 10 },
  { letra: "G", titulo: "Volumen (kg)", ancho: 12 },
  { letra: "H", titulo: "Descanso", ancho: 11 },
  { letra: "I", titulo: "Info ejercicio", ancho: 34 },
  { letra: "J", titulo: "Completado", ancho: 11 },
  { letra: "K", titulo: "Intensidad", ancho: 13 },
] as const;

export const TOTALES = [
  { campo: "B5", titulo: "Ejercicios totales" },
  { campo: "D5", titulo: "Series totales" },
  { campo: "F5", titulo: "Volumen total (kg)" },
  { campo: "H5", titulo: "Progreso de sesión" },
];

export interface Rect {
  x: number;
  y: number; // borde de abajo (coordenadas de PDF)
  ancho: number;
  alto: number;
}

const ALTO_TITULO = 28;
const ALTO_DATOS = 18;
const ALTO_ETIQUETA_TOTAL = 14;
const ALTO_VALOR_TOTAL = 24;
const ALTO_ENCABEZADO = 18;
export const ALTO_FILA = 19;
const ALTO_FILA_RESUMEN = 17;
const SEPARACION = 7;
const SEPARACION_TOTALES = 8;
const ANCHO_RESUMEN = 330;

// Posición de cada parte de la hoja.
export function geometria() {
  let arriba = ALTO_HOJA - MARGEN;
  const bajar = (alto: number) => {
    arriba -= alto;
    return arriba;
  };

  const titulo: Rect = { x: MARGEN, y: bajar(ALTO_TITULO), ancho: ANCHO_UTIL, alto: ALTO_TITULO };
  bajar(SEPARACION);
  const datos = { y: bajar(ALTO_DATOS), alto: ALTO_DATOS };
  bajar(SEPARACION);

  const anchoTotal = (ANCHO_UTIL - 3 * SEPARACION_TOTALES) / 4;
  const yEtiquetas = bajar(ALTO_ETIQUETA_TOTAL);
  const yValores = bajar(ALTO_VALOR_TOTAL);
  const totales = TOTALES.map((total, i) => {
    const x = MARGEN + i * (anchoTotal + SEPARACION_TOTALES);
    return {
      ...total,
      etiqueta: { x, y: yEtiquetas, ancho: anchoTotal, alto: ALTO_ETIQUETA_TOTAL },
      valor: { x, y: yValores, ancho: anchoTotal, alto: ALTO_VALOR_TOTAL },
    };
  });
  // En "Progreso de sesión" el número ocupa la mitad izquierda y la barra la derecha.
  const progreso = totales[3].valor;
  const barra: Rect = { x: progreso.x + progreso.ancho / 2, y: progreso.y + 7, ancho: progreso.ancho / 2 - 8, alto: progreso.alto - 14 };
  totales[3].valor = { ...progreso, ancho: progreso.ancho / 2 };
  bajar(SEPARACION + 2);

  const totalRelativo = COLUMNAS.reduce((suma, c) => suma + c.ancho, 0);
  let x = MARGEN;
  const columnas = COLUMNAS.map((c) => {
    const ancho = (c.ancho / totalRelativo) * ANCHO_UTIL;
    const columna = { ...c, x, ancho };
    x += ancho;
    return columna;
  });
  const encabezado = { y: bajar(ALTO_ENCABEZADO), alto: ALTO_ENCABEZADO };
  const filas = EJERCICIOS.map((ejercicio) => ({ ...ejercicio, y: bajar(ALTO_FILA) }));
  bajar(SEPARACION + 3);

  const anchosResumen = [ANCHO_RESUMEN * 0.4, ANCHO_RESUMEN * 0.2, ANCHO_RESUMEN * 0.2, ANCHO_RESUMEN * 0.2];
  const xResumen = anchosResumen.map((_, i) => MARGEN + anchosResumen.slice(0, i).reduce((s, a) => s + a, 0));
  const topeResumen = arriba;
  const resumen = {
    columnas: ["Resumen por bloque", "Ejercicios", "Series", "Volumen (kg)"].map((titulo, i) => ({ titulo, x: xResumen[i], ancho: anchosResumen[i], letra: "BCDE"[i] })),
    encabezado: { y: bajar(ALTO_FILA_RESUMEN), alto: ALTO_FILA_RESUMEN },
    filas: FILAS_RESUMEN.map((fila) => ({ ...fila, y: bajar(ALTO_FILA_RESUMEN), alto: ALTO_FILA_RESUMEN })),
  };
  const xGrafico = MARGEN + ANCHO_RESUMEN + 24;
  const grafico: Rect = { x: xGrafico, y: MARGEN, ancho: ANCHO_HOJA - MARGEN - xGrafico, alto: topeResumen - MARGEN };

  return { titulo, datos, totales, barra, columnas, encabezado, filas, resumen, grafico };
}

// ---------- Cuentas (las mismas del Excel) ----------

type Valores = Record<string, string>;
export const MARCADO = "Sí"; // valor guardado de una casilla "Completado" tildada

// "40", "32,5", "1.250", "1.250,5" → número; vacío o texto (ej.: "8-10") → null.
function aNumero(texto: string | undefined) {
  const limpio = (texto ?? "").trim().replace(/\s/g, "");
  if (!limpio) return null;
  const sinMiles = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio) ? limpio.replace(/\./g, "") : limpio;
  const numero = Number(sinMiles.replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

export const formatear = (numero: number) => numero.toLocaleString("es-AR", { maximumFractionDigits: 2 });

export function calcular(valores: Valores) {
  const campos: Valores = {};
  const porBloque = BLOQUES.map(() => ({ ejercicios: 0, series: 0, volumen: 0 }));
  let ejercicios = 0;
  let series = 0;
  let volumen = 0;
  let completados = 0;

  for (const { fila } of EJERCICIOS) {
    const nombre = (valores[`C${fila}`] ?? "").trim();
    const s = aNumero(valores[`D${fila}`]);
    const r = aNumero(valores[`E${fila}`]);
    const p = aNumero(valores[`F${fila}`]);
    // Como en el Excel: el volumen sale solo si series, repeticiones y peso son números.
    const v = s !== null && r !== null && p !== null ? s * r * p : null;
    campos[`G${fila}`] = v === null ? "" : formatear(v);
    if (nombre) ejercicios++;
    series += s ?? 0;
    volumen += v ?? 0;
    if (valores[`J${fila}`] === MARCADO) completados++;

    const bloque = BLOQUES.indexOf(valores[`B${fila}`] ?? "");
    if (bloque >= 0) {
      if (nombre) porBloque[bloque].ejercicios++;
      porBloque[bloque].series += s ?? 0;
      porBloque[bloque].volumen += v ?? 0;
    }
  }

  const progreso = ejercicios > 0 ? Math.min(1, completados / ejercicios) : 0;
  campos.B5 = String(ejercicios);
  campos.D5 = formatear(series);
  campos.F5 = formatear(volumen);
  campos.H5 = `${Math.round(progreso * 100)} %`;
  FILAS_RESUMEN.forEach(({ fila }, i) => {
    campos[`C${fila}`] = String(porBloque[i].ejercicios);
    campos[`D${fila}`] = formatear(porBloque[i].series);
    campos[`E${fila}`] = formatear(porBloque[i].volumen);
  });

  return { campos, progreso, volumenPorBloque: porBloque.map((b) => b.volumen) };
}

// Nombres de los campos que completa el sistema (de solo lectura en la planilla).
export const CAMPOS_CALCULADOS = new Set(Object.keys(calcular({}).campos));

// ---------- Partes que se dibujan al armar el PDF ----------

const NEGRO = rgb(0.1, 0.1, 0.12);
const GRIS = rgb(0.45, 0.45, 0.5);
const GRIS_CLARO = rgb(0.85, 0.85, 0.88);

function centrado(pagina: PDFPage, fuente: PDFFont, texto: string, x: number, ancho: number, y: number, tamanio: number, color = NEGRO) {
  pagina.drawText(texto, { x: x + (ancho - fuente.widthOfTextAtSize(texto, tamanio)) / 2, y, size: tamanio, font: fuente, color });
}

// Corta un texto en renglones que entren en el ancho dado.
function renglones(texto: string, fuente: PDFFont, tamanio: number, ancho: number) {
  const lineas: string[] = [];
  for (const palabra of texto.split(" ")) {
    const ultima = lineas.at(-1);
    if (ultima !== undefined && fuente.widthOfTextAtSize(`${ultima} ${palabra}`, tamanio) <= ancho) lineas[lineas.length - 1] = `${ultima} ${palabra}`;
    else lineas.push(palabra);
  }
  return lineas;
}

export function dibujarBarraProgreso(pagina: PDFPage, progreso: number) {
  const { barra } = geometria();
  pagina.drawRectangle({ ...rectPdf(barra), color: GRIS_CLARO });
  if (progreso > 0) pagina.drawRectangle({ x: barra.x, y: barra.y, width: barra.ancho * progreso, height: barra.alto, color: AZUL });
}

// Gráfico de barras "Distribución de volumen por bloque (kg)", como el del Excel.
export function dibujarGrafico(pagina: PDFPage, fuente: PDFFont, volumenPorBloque: number[]) {
  const { grafico: g } = geometria();
  pagina.drawRectangle({ ...rectPdf(g), borderColor: GRIS_CLARO, borderWidth: 1 });
  centrado(pagina, fuente, "Distribución de volumen por bloque (kg)", g.x, g.ancho, g.y + g.alto - 16, 9);

  const zona = { x: g.x + 16, y: g.y + 30, ancho: g.ancho - 32, alto: g.alto - 62 };
  pagina.drawLine({ start: { x: zona.x, y: zona.y }, end: { x: zona.x + zona.ancho, y: zona.y }, thickness: 1, color: GRIS });

  const maximo = Math.max(...volumenPorBloque);
  const lugar = zona.ancho / volumenPorBloque.length;
  const anchoBarra = lugar * 0.55;
  volumenPorBloque.forEach((volumen, i) => {
    const x = zona.x + i * lugar + (lugar - anchoBarra) / 2;
    const alto = maximo > 0 ? (volumen / maximo) * (zona.alto - 12) : 0;
    if (alto > 0) pagina.drawRectangle({ x, y: zona.y, width: anchoBarra, height: alto, color: AZUL });
    centrado(pagina, fuente, formatear(volumen), x, anchoBarra, zona.y + alto + 3, 7, GRIS);
    renglones(BLOQUES[i], fuente, 7, lugar - 4).forEach((linea, n) =>
      centrado(pagina, fuente, linea, zona.x + i * lugar, lugar, zona.y - 10 - n * 8.5, 7, GRIS),
    );
  });
  if (maximo === 0) centrado(pagina, fuente, "Sin volumen cargado", zona.x, zona.ancho, zona.y + zona.alto / 2, 8, GRIS);
}

export const rectPdf = (r: Rect) => ({ x: r.x, y: r.y, width: r.ancho, height: r.alto });
