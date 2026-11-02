import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, TextAlignment, rgb, type Color, type PDFFont, type PDFPage } from "pdf-lib";

// Genera los PDF rellenables de las rutinas a partir del diseño de los Excel de modelos de rutina.
// Cada campo se llama como su celda (A4, B4…), salvo nombre, edad, deporte y las fechas.
// Uso: npm run plantillas (desde backend). Regenerar no afecta a las rutinas guardadas mientras
// no cambien los nombres de los campos.

interface Celda {
  columna: number; // desde 0
  fila: number; // desde 1, como en el Excel
  ancho?: number; // columnas que ocupa
  alto?: number; // filas que ocupa
  texto?: string;
  campo?: string; // si tiene, se puede completar
  valor?: string; // valor inicial del campo
  color?: Color;
  izquierda?: boolean;
}

interface Modelo {
  nombre: string;
  columnas: number[]; // anchos de columna del Excel
  filas: number;
  celdas: Celda[];
}

const ANCHO_HOJA = 841.89; // A4 horizontal
const ALTO_HOJA = 595.28;
const MARGEN = 20;
const TAMANIO_LETRA = 8;

function hex(color: string) {
  const canal = (inicio: number) => parseInt(color.slice(inicio, inicio + 2), 16) / 255;
  return rgb(canal(0), canal(2), canal(4));
}

// Colores de tema del Excel: un color aclarado un 80 %.
function aclarado(color: string) {
  const canal = (inicio: number) => {
    const valor = parseInt(color.slice(inicio, inicio + 2), 16) / 255;
    return valor + (1 - valor) * 0.8;
  };
  return rgb(canal(0), canal(2), canal(4));
}

function letra(columna: number) {
  return String.fromCharCode(65 + columna);
}

function campoDeCelda(columna: number, fila: number, extras: Partial<Celda> = {}): Celda {
  return { columna, fila, campo: `${letra(columna)}${fila}`, ...extras };
}

const NARANJA = hex("FF9900");
const ROSA = hex("EA9999");
const VERDE = hex("93C47D");
const AMARILLO = hex("FFD966");

function modeloRutina(): Modelo {
  const celdas: Celda[] = [
    { columna: 0, fila: 1, texto: "NOMBRE:", izquierda: true },
    { columna: 1, fila: 1, ancho: 5, campo: "nombre" },
    { columna: 6, fila: 1, texto: "EDAD" },
    { columna: 7, fila: 1, campo: "edad" },
    { columna: 8, fila: 1, ancho: 2, texto: "DEPORTE" },
    { columna: 10, fila: 1, ancho: 3, campo: "deporte" },
    { columna: 13, fila: 1, alto: 3, texto: "DIA" },
    { columna: 0, fila: 2, texto: "FECHAS", izquierda: true },
    { columna: 0, fila: 3, texto: "EJERCICIOS", izquierda: true },
    { columna: 13, fila: 4, alto: 7, texto: "DIA 1" },
    { columna: 13, fila: 11, alto: 7, texto: "DIA 2" },
    { columna: 13, fila: 18, alto: 6, texto: "DIA 3" },
  ];
  [0, 1, 2, 3].forEach((microciclo) => {
    const inicio = 1 + microciclo * 3;
    celdas.push({ columna: inicio, fila: 2, ancho: 3, campo: `fecha_${microciclo + 1}`, valor: "2 SEMANAS" });
    ["KG", "REP", "SERIE"].forEach((texto, i) => celdas.push({ columna: inicio + i, fila: 3, texto }));
  });

  // Color de la columna de ejercicios, de a pares de filas como en el Excel.
  const NARANJA_CLARO = aclarado("FF6D01");
  const ROJO_CLARO = aclarado("EA4335");
  const VERDE_CLARO = aclarado("34A853");
  const coloresEjercicio = [NARANJA_CLARO, NARANJA_CLARO, ROJO_CLARO, ROJO_CLARO, VERDE_CLARO, VERDE_CLARO, VERDE_CLARO];
  const coloresColumnas = [NARANJA, ROSA, VERDE, AMARILLO];
  for (let fila = 4; fila <= 23; fila++) {
    celdas.push(campoDeCelda(0, fila, { color: coloresEjercicio[(fila - 4) % 7], izquierda: true }));
    for (let columna = 1; columna <= 12; columna++) {
      celdas.push(campoDeCelda(columna, fila, { color: coloresColumnas[Math.floor((columna - 1) / 3)] }));
    }
  }
  // Fila 24: la misma estructura, con los colores más suaves.
  const coloresFila24 = [hex("FFA767"), hex("F28E86"), hex("85CB98"), hex("FDD768")];
  celdas.push(campoDeCelda(0, 24, { color: VERDE_CLARO, izquierda: true }));
  for (let columna = 1; columna <= 12; columna++) {
    celdas.push(campoDeCelda(columna, 24, { color: coloresFila24[Math.floor((columna - 1) / 3)] }));
  }
  // Filas 25 a 29: renglones sueltos debajo de la tabla.
  for (let fila = 25; fila <= 29; fila++) celdas.push(campoDeCelda(0, fila, { izquierda: true }));

  const ejercicios = 37.7;
  const columna = 12.57;
  return { nombre: "Modelo Rutina", columnas: [ejercicios, ...Array<number>(13).fill(columna)], filas: 29, celdas };
}

function modeloRutina2(): Modelo {
  const ENCABEZADO = hex("6AA84F");
  const NARANJA2 = hex("FF9900");
  const AMARILLO2 = hex("FFFF00");
  const OCRE = hex("F1C232");
  const CLARO = hex("FFE599");
  const encabezado = { color: ENCABEZADO };

  const celdas: Celda[] = [
    { columna: 0, fila: 1, alto: 3, texto: "DIAS", ...encabezado },
    { columna: 1, fila: 1, texto: "NOMBRE:", ...encabezado },
    { columna: 2, fila: 1, ancho: 5, campo: "nombre", ...encabezado },
    { columna: 7, fila: 1, texto: "EDAD", ...encabezado },
    { columna: 8, fila: 1, campo: "edad", ...encabezado },
    { columna: 9, fila: 1, ancho: 2, texto: "SALUD", ...encabezado },
    { columna: 11, fila: 1, ancho: 3, campo: "deporte", ...encabezado },
    { columna: 1, fila: 2, texto: "FECHAS", ...encabezado },
    { columna: 1, fila: 3, texto: "EJERCICIOS", ...encabezado },
    { columna: 0, fila: 4, alto: 9, texto: "DIA 1 Y DIA 4", ...encabezado },
    { columna: 0, fila: 13, alto: 10, texto: "DIA 2 Y 5", ...encabezado },
    { columna: 0, fila: 23, alto: 8, texto: "DIA 3 Y 6", ...encabezado },
    { columna: 0, fila: 31, color: CLARO },
  ];
  ["descanso", "REP", "SERIE", "descanso", "REP", "SERIE", "KG", "REP", "SERIE", "KG", "REP", "SERIE"].forEach((texto, i) =>
    celdas.push({ columna: 2 + i, fila: 3, texto, ...encabezado }),
  );
  [0, 1, 2, 3].forEach((microciclo) => {
    celdas.push({ columna: 2 + microciclo * 3, fila: 2, ancho: 3, campo: `fecha_${microciclo + 1}`, valor: "2 SEMANAS", ...encabezado });
  });

  const coloresFila = [
    ...[NARANJA2, NARANJA2, AMARILLO2, AMARILLO2, OCRE, OCRE, OCRE, ENCABEZADO, CLARO], // filas 4 a 12
    ...[NARANJA2, NARANJA2, OCRE, OCRE, OCRE, AMARILLO2, AMARILLO2, AMARILLO2, ENCABEZADO, CLARO], // filas 13 a 22
    ...[OCRE, OCRE, NARANJA2, NARANJA2, NARANJA2, AMARILLO2, AMARILLO2, ENCABEZADO, CLARO], // filas 23 a 31
  ];
  coloresFila.forEach((color, i) => {
    const fila = 4 + i;
    celdas.push(campoDeCelda(1, fila, { color, izquierda: true }));
    for (let columna = 2; columna <= 13; columna++) celdas.push(campoDeCelda(columna, fila, { color }));
  });

  return { nombre: "Modelo Rutina 2", columnas: [10.43, 28, 8.29, 8.71, 6, 5.29, 5.86, 5.43, 5.43, 5.43, 5.86, 5.71, 5.86, 6], filas: 31, celdas };
}

function dibujarCelda(pdf: PDFDocument, pagina: PDFPage, negrita: PDFFont, modelo: Modelo, celda: Celda) {
  const total = modelo.columnas.reduce((suma, ancho) => suma + ancho, 0);
  const escala = (ANCHO_HOJA - 2 * MARGEN) / total;
  const altoFila = (ALTO_HOJA - 2 * MARGEN) / modelo.filas;
  const x = MARGEN + modelo.columnas.slice(0, celda.columna).reduce((suma, ancho) => suma + ancho, 0) * escala;
  const ancho = modelo.columnas.slice(celda.columna, celda.columna + (celda.ancho ?? 1)).reduce((suma, a) => suma + a, 0) * escala;
  const alto = altoFila * (celda.alto ?? 1);
  const y = ALTO_HOJA - MARGEN - altoFila * (celda.fila - 1) - alto;
  const color = celda.color ?? rgb(1, 1, 1);

  pagina.drawRectangle({ x, y, width: ancho, height: alto, color, borderColor: rgb(0, 0, 0), borderWidth: 1 });

  if (celda.texto) {
    const anchoTexto = negrita.widthOfTextAtSize(celda.texto, TAMANIO_LETRA);
    pagina.drawText(celda.texto, {
      x: celda.izquierda ? x + 4 : x + (ancho - anchoTexto) / 2,
      y: y + (alto - TAMANIO_LETRA) / 2 + 1,
      size: TAMANIO_LETRA,
      font: negrita,
    });
  }

  if (celda.campo) {
    const campo = pdf.getForm().createTextField(celda.campo);
    if (celda.valor) campo.setText(celda.valor);
    campo.addToPage(pagina, { x: x + 1, y: y + 1, width: ancho - 2, height: alto - 2, borderWidth: 0, backgroundColor: color });
    campo.setFontSize(TAMANIO_LETRA);
    campo.setAlignment(celda.izquierda ? TextAlignment.Left : TextAlignment.Center);
  }
}

async function generar(modelo: Modelo, carpeta: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(modelo.nombre);
  const pagina = pdf.addPage([ANCHO_HOJA, ALTO_HOJA]);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const celda of modelo.celdas) dibujarCelda(pdf, pagina, negrita, modelo, celda);
  await writeFile(path.join(carpeta, `${modelo.nombre}.pdf`), await pdf.save());
  console.log(`${modelo.nombre}.pdf: ${pdf.getForm().getFields().length} campos`);
}

async function main() {
  const carpeta = path.resolve(process.cwd(), "plantillas");
  await mkdir(carpeta, { recursive: true });
  await generar(modeloRutina(), carpeta);
  await generar(modeloRutina2(), carpeta);
}

main();
