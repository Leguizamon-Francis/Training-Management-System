// Reporte en PDF de las evaluaciones de un alumno: resumen y, por test, sus métricas y un gráfico de
// evolución. Se arma en el momento con pdf-lib y se envía para descargar: no se guarda.
import type { CategoriaPrueba, Lado } from "@prisma/client";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { calcularEdad, formatearFechaTexto, hoyComoTexto, textoDesdeFecha } from "../../lib/fechas";
import { obtenerAlumno } from "../alumnos/alumnos.service";
import { listarEvaluaciones } from "./evaluaciones.service";

// ---------- Datos ----------

interface Punto {
  numero: number; // "Evaluación n°"
  fecha: string; // "aaaa-mm-dd"
  valor: number;
}

interface Serie {
  lado: Lado | null;
  puntos: Punto[]; // de la más vieja a la más nueva
}

interface TestDelReporte {
  nombre: string;
  categoria: CategoriaPrueba;
  unidad: string;
  series: Serie[];
}

const ETIQUETAS_CATEGORIA: Record<CategoriaPrueba, string> = {
  FUERZA: "Fuerza",
  POTENCIA: "Potencia",
  VELOCIDAD: "Velocidad",
  MOVILIDAD: "Movilidad",
  RESISTENCIA: "Resistencia",
};
// Mismo orden que los gráficos de la pantalla.
const ORDEN_CATEGORIA = Object.keys(ETIQUETAS_CATEGORIA) as CategoriaPrueba[];
const ETIQUETAS_LADO: Record<Lado, string> = { IZQ: "Izquierdo", DER: "Derecho" };

type Evaluaciones = Awaited<ReturnType<typeof listarEvaluaciones>>["evaluaciones"];

// Un test por prueba, con una serie sin lado o dos (izquierdo y derecho). Igual que armarGraficos del frontend.
function agruparPorTest(evaluaciones: Evaluaciones): TestDelReporte[] {
  const tests = new Map<number, TestDelReporte>();
  const cronologicas = [...evaluaciones].sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.idEvaluacion - b.idEvaluacion);
  for (const evaluacion of cronologicas) {
    for (const resultado of evaluacion.resultados) {
      let test = tests.get(resultado.prueba.id);
      if (!test) {
        test = { nombre: resultado.prueba.nombre, categoria: resultado.prueba.categoria, unidad: resultado.unidad, series: [] };
        tests.set(resultado.prueba.id, test);
      }
      test.unidad = resultado.unidad; // la de la medición más reciente
      let serie = test.series.find((s) => s.lado === resultado.lado);
      if (!serie) {
        serie = { lado: resultado.lado, puntos: [] };
        test.series.push(serie);
      }
      serie.puntos.push({ numero: evaluacion.idEvaluacion, fecha: textoDesdeFecha(evaluacion.fecha), valor: Number(resultado.valor) });
    }
  }
  const orden = (lado: Lado | null) => (lado === null ? 0 : lado === "IZQ" ? 1 : 2);
  for (const test of tests.values()) test.series.sort((a, b) => orden(a.lado) - orden(b.lado));
  return [...tests.values()].sort(
    (a, b) => ORDEN_CATEGORIA.indexOf(a.categoria) - ORDEN_CATEGORIA.indexOf(b.categoria) || a.nombre.localeCompare(b.nombre),
  );
}

// ---------- Textos ----------

function numero(valor: number) {
  return valor.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

// "+2,5 cm (+8,3 %)". Sin colores ni flechas: según el test, subir puede ser mejor o peor.
function variacion(anterior: number, actual: number, unidad: string) {
  const diferencia = actual - anterior;
  if (diferencia === 0) return "Sin cambios";
  const signo = diferencia > 0 ? "+" : "";
  const porcentaje = anterior !== 0 ? ` (${signo}${numero((diferencia / Math.abs(anterior)) * 100)} %)` : "";
  return `${signo}${numero(diferencia)} ${unidad}${porcentaje}`;
}

// Diferencia entre lados en la última evaluación que tiene los dos, respecto del lado mayor.
function asimetria(test: TestDelReporte) {
  const izquierdo = test.series.find((s) => s.lado === "IZQ");
  const derecho = test.series.find((s) => s.lado === "DER");
  if (!izquierdo || !derecho) return null;
  for (let i = izquierdo.puntos.length - 1; i >= 0; i--) {
    const izq = izquierdo.puntos[i];
    const der = derecho.puntos.find((p) => p.numero === izq.numero);
    if (!der) continue;
    const mayor = Math.max(Math.abs(izq.valor), Math.abs(der.valor));
    const porcentaje = mayor === 0 ? 0 : (Math.abs(izq.valor - der.valor) / mayor) * 100;
    return `Asimetría en la evaluación n° ${izq.numero}: ${numero(porcentaje)} % (${numero(Math.abs(izq.valor - der.valor))} ${test.unidad})`;
  }
  return null;
}

// ---------- Dibujo ----------

const ANCHO_HOJA = 595.28; // A4 en puntos
const ALTO_HOJA = 841.89;
const MARGEN = 42;
const ANCHO_UTIL = ANCHO_HOJA - 2 * MARGEN;

const COLOR_TEXTO = rgb(0.13, 0.15, 0.18);
const COLOR_SUAVE = rgb(0.42, 0.45, 0.5);
const COLOR_LINEA = rgb(0.82, 0.84, 0.87);
const COLOR_MARCA = rgb(15 / 255, 42 / 255, 68 / 255); // azul del logo
const COLOR_SERIE_1 = rgb(0x2a / 255, 0x78 / 255, 0xd6 / 255); // los mismos de los gráficos en tema claro
const COLOR_SERIE_2 = rgb(0xeb / 255, 0x68 / 255, 0x34 / 255);

const colorDeLado = (lado: Lado | null) => (lado === "DER" ? COLOR_SERIE_2 : COLOR_SERIE_1);

// Arma el PDF de a una hoja, bajando un cursor; si algo no entra, empieza otra hoja.
class Hojas {
  private hoja!: PDFPage;
  y = 0;

  constructor(
    private documento: PDFDocument,
    private normal: PDFFont,
    private negrita: PDFFont,
  ) {
    this.nuevaHoja();
  }

  get pagina() {
    return this.hoja;
  }

  nuevaHoja() {
    this.hoja = this.documento.addPage([ANCHO_HOJA, ALTO_HOJA]);
    this.y = ALTO_HOJA - MARGEN;
  }

  asegurarEspacio(alto: number) {
    if (this.y - alto < MARGEN + 20) this.nuevaHoja();
  }

  // Las fuentes estándar del PDF no tienen todos los caracteres (ej.: emojis): los que faltan se cambian por "?".
  limpiar(texto: string, negrita = false) {
    const fuente = negrita ? this.negrita : this.normal;
    return [...texto.replace(/\s+/g, " ")]
      .map((caracter) => {
        try {
          fuente.encodeText(caracter);
          return caracter;
        } catch {
          return "?";
        }
      })
      .join("");
  }

  ancho(texto: string, tamanio: number, negrita = false) {
    return (negrita ? this.negrita : this.normal).widthOfTextAtSize(this.limpiar(texto, negrita), tamanio);
  }

  texto(texto: string, x: number, y: number, { tamanio = 10, negrita = false, color = COLOR_TEXTO }: { tamanio?: number; negrita?: boolean; color?: RGB } = {}) {
    this.hoja.drawText(this.limpiar(texto, negrita), { x, y, size: tamanio, font: negrita ? this.negrita : this.normal, color });
  }

  // Escribe un párrafo cortando las líneas por palabras y baja el cursor.
  parrafo(texto: string, { tamanio = 10, negrita = false, color = COLOR_TEXTO, sangria = 0 } = {}) {
    const anchoMaximo = ANCHO_UTIL - sangria;
    const lineas: string[] = [];
    let linea = "";
    for (const palabra of this.limpiar(texto, negrita).split(" ")) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (linea && this.ancho(prueba, tamanio, negrita) > anchoMaximo) {
        lineas.push(linea);
        linea = palabra;
      } else {
        linea = prueba;
      }
    }
    if (linea) lineas.push(linea);
    for (const l of lineas) {
      this.asegurarEspacio(tamanio * 1.4);
      this.y -= tamanio * 1.4;
      this.texto(l, MARGEN + sangria, this.y + tamanio * 0.3, { tamanio, negrita, color });
    }
  }

  linea(x1: number, y1: number, x2: number, y2: number, color = COLOR_LINEA, grosor = 1) {
    this.hoja.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness: grosor });
  }

  titulo(texto: string) {
    this.asegurarEspacio(40);
    this.y -= 22;
    this.texto(texto, MARGEN, this.y, { tamanio: 13, negrita: true, color: COLOR_MARCA });
    this.y -= 6;
    this.linea(MARGEN, this.y, ANCHO_HOJA - MARGEN, this.y, COLOR_MARCA, 1.5);
  }
}

// Escala "redonda" para el eje Y, como en los gráficos de la pantalla.
function escalaY(minimo: number, maximo: number) {
  if (minimo === maximo) {
    const margen = Math.abs(minimo) * 0.1 || 1;
    minimo -= margen;
    maximo += margen;
  }
  const pasoCrudo = (maximo - minimo) / 4;
  const magnitud = 10 ** Math.floor(Math.log10(pasoCrudo));
  const normalizado = pasoCrudo / magnitud;
  const paso = (normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 2.5 ? 2.5 : normalizado <= 5 ? 5 : 10) * magnitud;
  const inicio = Math.floor(minimo / paso) * paso;
  const fin = Math.ceil(maximo / paso) * paso;
  const marcas: number[] = [];
  for (let valor = inicio; valor <= fin + paso / 2; valor += paso) marcas.push(Number(valor.toFixed(10)));
  return { inicio, fin, marcas };
}

const ALTO_GRAFICO = 150;
const MAXIMO_ROTULOS_X = 8;

function dibujarGrafico(hojas: Hojas, test: TestDelReporte) {
  const izquierda = MARGEN + 46;
  const derecha = ANCHO_HOJA - MARGEN - 10;
  const abajo = hojas.y - ALTO_GRAFICO + 32; // lugar para los rótulos del eje X
  const arriba = hojas.y - 12; // lugar para el rótulo del punto más alto

  // Eje X: una posición por evaluación de este test, en orden.
  const porNumero = new Map<number, Punto>();
  for (const punto of test.series.flatMap((s) => s.puntos)) porNumero.set(punto.numero, punto);
  const evaluaciones = [...porNumero.values()].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero - b.numero);
  const indice = new Map(evaluaciones.map((p, i) => [p.numero, i]));
  const posX = (p: Punto) =>
    evaluaciones.length === 1 ? (izquierda + derecha) / 2 : izquierda + 14 + ((indice.get(p.numero) ?? 0) * (derecha - izquierda - 28)) / (evaluaciones.length - 1);

  const valores = test.series.flatMap((s) => s.puntos.map((p) => p.valor));
  const escala = escalaY(Math.min(...valores), Math.max(...valores));
  const posY = (valor: number) => abajo + ((valor - escala.inicio) / (escala.fin - escala.inicio)) * (arriba - abajo);

  // Grilla y valores del eje Y.
  for (const marca of escala.marcas) {
    const y = posY(marca);
    hojas.linea(izquierda, y, derecha, y);
    const rotulo = numero(marca);
    hojas.texto(rotulo, izquierda - 6 - hojas.ancho(rotulo, 8), y - 3, { tamanio: 8, color: COLOR_SUAVE });
  }

  // Rótulos del eje X: n° y fecha (si son muchas, una de cada tantas, contando desde la última).
  const cada = Math.ceil(evaluaciones.length / MAXIMO_ROTULOS_X);
  evaluaciones.forEach((punto, i) => {
    if ((evaluaciones.length - 1 - i) % cada !== 0) return;
    const x = posX(punto);
    const n = `N° ${punto.numero}`;
    const fecha = formatearFechaTexto(punto.fecha);
    hojas.texto(n, x - hojas.ancho(n, 7.5) / 2, abajo - 17, { tamanio: 7.5, color: COLOR_SUAVE });
    hojas.texto(fecha, x - hojas.ancho(fecha, 7.5) / 2, abajo - 27, { tamanio: 7.5, color: COLOR_SUAVE });
  });

  // Líneas, puntos y el valor de cada punto (el derecho debajo, para que no se encime con el izquierdo).
  for (const serie of test.series) {
    const color = colorDeLado(serie.lado);
    for (let i = 1; i < serie.puntos.length; i++) {
      const a = serie.puntos[i - 1];
      const b = serie.puntos[i];
      hojas.linea(posX(a), posY(a.valor), posX(b), posY(b.valor), color, 2.5);
    }
    for (const punto of serie.puntos) {
      const x = posX(punto);
      const y = posY(punto.valor);
      hojas.pagina.drawCircle({ x, y, size: 3.5, color });
      const rotulo = numero(punto.valor);
      // En el borde de abajo no hay lugar: se escribe arriba aunque sea el derecho.
      const debajo = serie.lado === "DER" && y - 13 > abajo;
      hojas.texto(rotulo, x - hojas.ancho(rotulo, 8, true) / 2, debajo ? y - 13 : y + 6, { tamanio: 8, negrita: true, color });
    }
  }

  hojas.y -= ALTO_GRAFICO;
}

function dibujarTest(hojas: Hojas, test: TestDelReporte) {
  const conLados = test.series.some((s) => s.lado);
  const lineasMetricas = test.series.length + (conLados ? 1 : 0);
  hojas.asegurarEspacio(34 + lineasMetricas * 14 + ALTO_GRAFICO + (conLados ? 14 : 0));

  hojas.y -= 18;
  hojas.texto(test.nombre, MARGEN, hojas.y, { tamanio: 11.5, negrita: true });
  const detalle = `${ETIQUETAS_CATEGORIA[test.categoria]} · ${test.unidad}`;
  hojas.texto(detalle, MARGEN + hojas.ancho(test.nombre, 11.5, true) + 8, hojas.y, { tamanio: 9, color: COLOR_SUAVE });

  // Métricas: último valor, cambio respecto de la anterior y de la primera.
  for (const serie of test.series) {
    const primero = serie.puntos[0];
    const anterior = serie.puntos[serie.puntos.length - 2];
    const ultimo = serie.puntos[serie.puntos.length - 1];
    const partes = [`Último: ${numero(ultimo.valor)} ${test.unidad} (n° ${ultimo.numero})`];
    if (anterior) partes.push(`Respecto de la anterior: ${variacion(anterior.valor, ultimo.valor, test.unidad)}`);
    if (serie.puntos.length > 2) partes.push(`Respecto de la primera: ${variacion(primero.valor, ultimo.valor, test.unidad)}`);
    hojas.y -= 14;
    let x = MARGEN;
    if (serie.lado) {
      hojas.pagina.drawCircle({ x: x + 3, y: hojas.y + 3, size: 3, color: colorDeLado(serie.lado) });
      x += 10;
      const lado = `${ETIQUETAS_LADO[serie.lado]}: `;
      hojas.texto(lado, x, hojas.y, { tamanio: 9, negrita: true });
      x += hojas.ancho(lado, 9, true);
    }
    hojas.texto(partes.join("   ·   "), x, hojas.y, { tamanio: 9 });
  }
  const textoAsimetria = conLados ? asimetria(test) : null;
  if (textoAsimetria) {
    hojas.y -= 14;
    hojas.texto(textoAsimetria, MARGEN, hojas.y, { tamanio: 9 });
  }

  hojas.y -= 8;
  dibujarGrafico(hojas, test);
}

// ---------- Reporte ----------

export async function reporteEvaluaciones(alumnoId: number) {
  const alumno = await obtenerAlumno(alumnoId);
  const { evaluaciones } = await listarEvaluaciones(alumnoId);
  const hoy = hoyComoTexto();
  const nombreAlumno = `${alumno.apellido}, ${alumno.nombre}`;

  const documento = await PDFDocument.create();
  documento.setTitle(`Reporte de evaluaciones - ${nombreAlumno}`);
  documento.setCreator("DV Training");
  const normal = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  const hojas = new Hojas(documento, normal, negrita);

  // Encabezado
  hojas.y -= 20;
  hojas.texto("Reporte de evaluaciones", MARGEN, hojas.y, { tamanio: 20, negrita: true, color: COLOR_MARCA });
  hojas.y -= 24;
  hojas.texto(nombreAlumno, MARGEN, hojas.y, { tamanio: 14, negrita: true });
  hojas.y -= 4;
  const datos = [
    `Perfil: ${alumno.perfil.nombre}`,
    `Edad: ${calcularEdad(textoDesdeFecha(alumno.fechaNacimiento), hoy)} años`,
    `Generado el ${formatearFechaTexto(hoy)}`,
  ];
  hojas.parrafo(datos.join("   ·   "), { tamanio: 9.5, color: COLOR_SUAVE });

  // Resumen
  hojas.titulo("Resumen");
  if (evaluaciones.length === 0) {
    hojas.parrafo("Todavía no tiene evaluaciones.");
  } else {
    const primera = evaluaciones[evaluaciones.length - 1]; // vienen de la más nueva a la más vieja
    const ultima = evaluaciones[0];
    hojas.y -= 4;
    hojas.parrafo(`Evaluaciones realizadas: ${evaluaciones.length}`);
    if (evaluaciones.length > 1) {
      hojas.parrafo(`Período: del ${formatearFechaTexto(textoDesdeFecha(primera.fecha))} al ${formatearFechaTexto(textoDesdeFecha(ultima.fecha))}`);
    } else {
      hojas.parrafo(`Fecha: ${formatearFechaTexto(textoDesdeFecha(ultima.fecha))}`);
    }
  }
  // Un bloque por test
  const tests = agruparPorTest(evaluaciones);
  if (tests.length > 0) {
    hojas.titulo("Evolución por test");
    for (const test of tests) dibujarTest(hojas, test);
  }

  // Pie de cada hoja
  const paginas = documento.getPages();
  paginas.forEach((pagina, i) => {
    const pie = `${nombreAlumno} · Reporte de evaluaciones · Página ${i + 1} de ${paginas.length}`;
    const limpio = hojas.limpiar(pie);
    pagina.drawText(limpio, {
      x: ANCHO_HOJA - MARGEN - normal.widthOfTextAtSize(limpio, 8),
      y: MARGEN - 18,
      size: 8,
      font: normal,
      color: COLOR_SUAVE,
    });
  });

  return {
    bytes: await documento.save(),
    nombreArchivo: `Reporte de evaluaciones - ${nombreAlumno} - ${formatearFechaTexto(hoy)}.pdf`,
  };
}
