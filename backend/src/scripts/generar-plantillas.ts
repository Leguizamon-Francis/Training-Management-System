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

// Un recuadro de la hoja, en puntos (y desde abajo, como en PDF).
interface Recuadro {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  texto?: string;
  tamanioTexto?: number;
  campo?: string;
  valor?: string;
  color?: Color;
  izquierda?: boolean;
  variasLineas?: boolean; // el campo admite varios renglones
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

function dibujarRecuadro(pdf: PDFDocument, pagina: PDFPage, negrita: PDFFont, r: Recuadro) {
  const color = r.color ?? rgb(1, 1, 1);
  pagina.drawRectangle({ x: r.x, y: r.y, width: r.ancho, height: r.alto, color, borderColor: rgb(0, 0, 0), borderWidth: 1 });

  if (r.texto) {
    const tamanio = r.tamanioTexto ?? TAMANIO_LETRA;
    const lineas = renglones(r.texto, negrita, tamanio, r.ancho - 4);
    const interlineado = tamanio * 1.15;
    // Los renglones quedan centrados en el alto del recuadro.
    const primera = r.y + (r.alto + (lineas.length - 1) * interlineado - tamanio) / 2 + 1;
    lineas.forEach((linea, i) => {
      const anchoTexto = negrita.widthOfTextAtSize(linea, tamanio);
      pagina.drawText(linea, {
        x: r.izquierda ? r.x + 4 : r.x + (r.ancho - anchoTexto) / 2,
        y: primera - i * interlineado,
        size: tamanio,
        font: negrita,
      });
    });
  }

  if (r.campo) {
    const campo = pdf.getForm().createTextField(r.campo);
    if (r.variasLineas) campo.enableMultiline();
    if (r.valor) campo.setText(r.valor);
    campo.addToPage(pagina, { x: r.x + 1, y: r.y + 1, width: r.ancho - 2, height: r.alto - 2, borderWidth: 0, backgroundColor: color });
    campo.setFontSize(TAMANIO_LETRA);
    campo.setAlignment(r.izquierda ? TextAlignment.Left : TextAlignment.Center);
  }
}

// Modelos de una hoja A4: cada celda se ubica en la grilla del Excel, escalada al ancho de la hoja.
function dibujarCelda(pdf: PDFDocument, pagina: PDFPage, negrita: PDFFont, modelo: Modelo, celda: Celda) {
  const total = modelo.columnas.reduce((suma, ancho) => suma + ancho, 0);
  const escala = (ANCHO_HOJA - 2 * MARGEN) / total;
  const altoFila = (ALTO_HOJA - 2 * MARGEN) / modelo.filas;
  const x = MARGEN + modelo.columnas.slice(0, celda.columna).reduce((suma, ancho) => suma + ancho, 0) * escala;
  const ancho = modelo.columnas.slice(celda.columna, celda.columna + (celda.ancho ?? 1)).reduce((suma, a) => suma + a, 0) * escala;
  const alto = altoFila * (celda.alto ?? 1);
  const y = ALTO_HOJA - MARGEN - altoFila * (celda.fila - 1) - alto;
  dibujarRecuadro(pdf, pagina, negrita, { ...celda, x, y, ancho, alto });
}

async function generar(modelo: Modelo, carpeta: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(modelo.nombre);
  const pagina = pdf.addPage([ANCHO_HOJA, ALTO_HOJA]);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const celda of modelo.celdas) dibujarCelda(pdf, pagina, negrita, modelo, celda);
  await guardar(pdf, modelo.nombre, carpeta);
}

async function guardar(pdf: PDFDocument, nombre: string, carpeta: string) {
  await writeFile(path.join(carpeta, `${nombre}.pdf`), await pdf.save());
  console.log(`${nombre}.pdf: ${pdf.getForm().getFields().length} campos`);
}

// ---------- Planilla de 6 semanas ----------
// Un día por hoja (el Excel es muy ancho para una sola). Cada ejercicio ocupa dos renglones: series,
// repeticiones, RPE y kilos se anotan en cada renglón; las demás columnas abarcan los dos. Los campos se llaman
// como la celda del Excel (A3, C3, F4, AO3…), con su número de fila aunque cada día vaya en su hoja. Arriba de
// la primera hoja se agregaron nombre, edad y deporte, como en los otros modelos.

const SEMANAS = 6;
const COLUMNAS_SEMANA = [
  { titulo: "SERIES", ancho: 34 },
  { titulo: "REPS", ancho: 34 },
  { titulo: "RPE (GRADO DE ESFUERZO)", ancho: 44 },
  { titulo: "KGS SUGERIDOS PARA EL EJERCICIO", ancho: 46 },
  { titulo: "KGS (ANOTA ACA)", ancho: 40 },
  { titulo: "ANOTACIONES DEL ALUMNO", ancho: 80, unaPorEjercicio: true },
  { titulo: "CORRECCIONES", ancho: 80, unaPorEjercicio: true },
];
// Columnas A a E: descansos, número, ejercicio, notas y RM anteriores.
const ANCHOS_INICIO = [52, 22, 150, 170, 46];

// Fila del encabezado de cada día en el Excel y cuántos ejercicios abarca cada descanso (columna A).
// En el Excel el quinto día también dice "Dia 4".
const DIAS = [
  { titulo: "Dia 1", fila: 1, descansos: [1, 1, 1, 1, 1, 2] },
  { titulo: "Dia 2", fila: 18, descansos: [1, 1, 1, 1, 1, 2] },
  { titulo: "Dia 3", fila: 35, descansos: [1, 1, 1, 2, 1, 2] },
  { titulo: "Dia 4", fila: 54, descansos: [1, 1, 1, 1, 1, 1, 2] },
  { titulo: "Dia 5", fila: 73, descansos: [1, 1, 1, 1, 1, 1, 2] },
];

const ALTO_TITULO = 18; // fila "Dia 1 / SEMANA 1…"
const ALTO_COLUMNAS = 36; // fila con el nombre de cada columna
const ALTO_RENGLON = 18;
const ALTO_DATOS_ALUMNO = 20;
const SEPARACION = 8;
const TAMANIO_ENCABEZADO = 6.5;

// Letras de columna como en el Excel: 0 → A, 25 → Z, 26 → AA.
function columnaExcel(indice: number): string {
  return indice < 26 ? letra(indice) : columnaExcel(Math.floor(indice / 26) - 1) + letra(indice % 26);
}

async function planilla6Semanas(carpeta: string) {
  const nombre = "Planilla 6 semanas";
  const CELESTE = hex("D0E0E3");
  const GRIS = hex("F3F3F3");
  const columnasSemana = Array.from({ length: SEMANAS }, () => COLUMNAS_SEMANA).flat();
  const anchos = [...ANCHOS_INICIO, ...columnasSemana.map((c) => c.ancho)];
  const xDe = (columna: number) => MARGEN + anchos.slice(0, columna).reduce((suma, a) => suma + a, 0);
  const anchoDe = (columna: number, cuantas = 1) => anchos.slice(columna, columna + cuantas).reduce((suma, a) => suma + a, 0);
  const maxRenglones = Math.max(...DIAS.map((dia) => dia.descansos.reduce((suma, n) => suma + n, 0) * 2));
  const anchoHoja = xDe(anchos.length) + MARGEN;
  const altoHoja = 2 * MARGEN + ALTO_DATOS_ALUMNO + SEPARACION + ALTO_TITULO + ALTO_COLUMNAS + maxRenglones * ALTO_RENGLON;

  const pdf = await PDFDocument.create();
  pdf.setTitle(nombre);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  DIAS.forEach((dia, numeroDia) => {
    const pagina = pdf.addPage([anchoHoja, altoHoja]);
    const dibujar = (r: Recuadro) => dibujarRecuadro(pdf, pagina, negrita, r);
    const arriba = altoHoja - MARGEN;

    if (numeroDia === 0) {
      const datos = { y: arriba - ALTO_DATOS_ALUMNO, alto: ALTO_DATOS_ALUMNO, color: CELESTE };
      const filas = [
        { texto: "NOMBRE:", anchoTexto: anchoDe(0, 2), campo: "nombre", ancho: 260 },
        { texto: "EDAD", anchoTexto: 46, campo: "edad", ancho: 46 },
        { texto: "DEPORTE", anchoTexto: 60, campo: "deporte", ancho: 220 },
      ];
      let x = MARGEN;
      for (const { texto, anchoTexto, campo, ancho } of filas) {
        dibujar({ ...datos, x, ancho: anchoTexto, texto });
        dibujar({ ...datos, x: x + anchoTexto, ancho, campo, izquierda: campo !== "edad" });
        x += anchoTexto + ancho;
      }
    }

    // Encabezado: "Dia N", notas, RM anteriores y el título de cada semana; debajo, los nombres de las columnas.
    const yTitulo = arriba - ALTO_DATOS_ALUMNO - SEPARACION - ALTO_TITULO;
    const yColumnas = yTitulo - ALTO_COLUMNAS;
    const altoDoble = ALTO_TITULO + ALTO_COLUMNAS;
    const encabezado = { color: CELESTE, tamanioTexto: TAMANIO_ENCABEZADO };
    dibujar({ ...encabezado, x: xDe(0), y: yTitulo, ancho: anchoDe(0), alto: ALTO_TITULO, texto: dia.titulo, tamanioTexto: TAMANIO_LETRA });
    dibujar({ ...encabezado, x: xDe(0), y: yColumnas, ancho: anchoDe(0), alto: ALTO_COLUMNAS, texto: "DESCANSOS" });
    dibujar({ ...encabezado, x: xDe(1), y: yColumnas, ancho: anchoDe(1, 2), alto: altoDoble });
    dibujar({ ...encabezado, x: xDe(3), y: yColumnas, ancho: anchoDe(3), alto: altoDoble, texto: "NOTAS DE LOS EJERCICIOS (EXPLICACIONES BREVES)" });
    dibujar({ x: xDe(4), y: yColumnas, ancho: anchoDe(4), alto: altoDoble, texto: "RM ANTERIORES", tamanioTexto: TAMANIO_ENCABEZADO });
    for (let semana = 0; semana < SEMANAS; semana++) {
      const primera = ANCHOS_INICIO.length + semana * COLUMNAS_SEMANA.length;
      dibujar({ x: xDe(primera), y: yTitulo, ancho: anchoDe(primera, COLUMNAS_SEMANA.length), alto: ALTO_TITULO, texto: `SEMANA ${semana + 1}`, color: GRIS });
      COLUMNAS_SEMANA.forEach((columna, i) =>
        dibujar({ x: xDe(primera + i), y: yColumnas, ancho: columna.ancho, alto: ALTO_COLUMNAS, texto: columna.titulo, tamanioTexto: TAMANIO_ENCABEZADO }),
      );
    }

    // Ejercicios: empiezan dos filas debajo del encabezado del día, de a dos renglones.
    let fila = dia.fila + 2;
    let y = yColumnas;
    for (const ejercicios of dia.descansos) {
      const altoDescanso = ejercicios * 2 * ALTO_RENGLON;
      dibujar({ x: xDe(0), y: y - altoDescanso, ancho: anchoDe(0), alto: altoDescanso, campo: `A${fila}`, variasLineas: true });
      for (let e = 0; e < ejercicios; e++) {
        y -= 2 * ALTO_RENGLON;
        const dosRenglones = { y, alto: 2 * ALTO_RENGLON };
        dibujar({ ...dosRenglones, x: xDe(1), ancho: anchoDe(1), campo: `B${fila}` });
        dibujar({ ...dosRenglones, x: xDe(2), ancho: anchoDe(2), campo: `C${fila}`, izquierda: true, variasLineas: true });
        dibujar({ ...dosRenglones, x: xDe(3), ancho: anchoDe(3), campo: `D${fila}`, izquierda: true, variasLineas: true });
        dibujar({ ...dosRenglones, x: xDe(4), ancho: anchoDe(4), campo: `E${fila}` });
        columnasSemana.forEach((columna, i) => {
          const indice = ANCHOS_INICIO.length + i;
          const columnaX = { x: xDe(indice), ancho: columna.ancho };
          if (columna.unaPorEjercicio) {
            dibujar({ ...columnaX, ...dosRenglones, campo: `${columnaExcel(indice)}${fila}`, izquierda: true, variasLineas: true });
          } else {
            dibujar({ ...columnaX, y: y + ALTO_RENGLON, alto: ALTO_RENGLON, campo: `${columnaExcel(indice)}${fila}` });
            dibujar({ ...columnaX, y, alto: ALTO_RENGLON, campo: `${columnaExcel(indice)}${fila + 1}` });
          }
        });
        fila += 2;
      }
    }
  });

  await guardar(pdf, nombre, carpeta);
}

async function main() {
  const carpeta = path.resolve(process.cwd(), "plantillas");
  await mkdir(carpeta, { recursive: true });
  await generar(modeloRutina(), carpeta);
  await generar(modeloRutina2(), carpeta);
  await planilla6Semanas(carpeta);
}

main();
