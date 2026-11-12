import type { Evaluacion, Lado, OrigenResultado, ProximaEvaluacion } from "../api/evaluaciones";
import type { CategoriaPrueba } from "../api/pruebas";

export const ETIQUETAS_CATEGORIA: Record<CategoriaPrueba, string> = {
  FUERZA: "Fuerza",
  POTENCIA: "Potencia",
  VELOCIDAD: "Velocidad",
  MOVILIDAD: "Movilidad",
  RESISTENCIA: "Resistencia",
};

export const ETIQUETAS_LADO: Record<Lado, string> = {
  IZQ: "Izquierdo",
  DER: "Derecho",
};

export const ETIQUETAS_ORIGEN: Record<OrigenResultado, string> = {
  PLATAFORMA_FUERZA: "Plataforma de fuerza",
  MYJUMP: "MyJump",
  MANUAL: "Manual",
};

// Número con coma decimal y hasta 2 decimales: 1234.5 → "1.234,5".
export function formatearNumero(valor: number | string) {
  return Number(valor).toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function nombreConLado(nombre: string, lado: Lado | null) {
  return lado ? `${nombre} (${ETIQUETAS_LADO[lado].toLowerCase()})` : nombre;
}

// Diferencia entre dos mediciones, ej.: "+2,5 cm (+8,3 %)" (la flecha la agrega el componente Variacion).
// No se colorea como "mejor" o "peor": según la prueba, subir puede ser bueno (salto) o malo (tiempo de sprint).
export function textoVariacion(anterior: number, actual: number, unidad: string) {
  const diferencia = actual - anterior;
  if (diferencia === 0) return "Sin cambios";
  const signo = diferencia > 0 ? "+" : "";
  const porcentaje =
    anterior !== 0 ? ` (${signo}${formatearNumero((diferencia / Math.abs(anterior)) * 100)} %)` : "";
  return `${signo}${formatearNumero(diferencia)} ${unidad}${porcentaje}`;
}

// ---------- Gráficos ----------

export interface PuntoGrafico {
  evaluacionId: number;
  numero: number; // "Evaluación n°"
  fecha: string; // "aaaa-mm-dd"
  valor: number;
}

interface SerieGrafico {
  lado: Lado | null;
  puntos: PuntoGrafico[]; // de la más vieja a la más nueva
}

export interface DatosGrafico {
  pruebaId: number;
  nombre: string;
  categoria: CategoriaPrueba;
  unidad: string;
  series: SerieGrafico[]; // sin lado, o izquierdo y derecho (para compararlos en el mismo gráfico)
}

// Orden en que se muestran los gráficos según la categoría de la prueba.
const ORDEN_CATEGORIA_GRAFICOS: Record<CategoriaPrueba, number> = {
  FUERZA: 0,
  POTENCIA: 1,
  VELOCIDAD: 2,
  MOVILIDAD: 3,
  RESISTENCIA: 4,
};

// Un gráfico por prueba (cada prueba tiene su unidad y su escala).
export function armarGraficos(evaluaciones: Evaluacion[]): DatosGrafico[] {
  const graficos = new Map<number, DatosGrafico>();
  const cronologicas = [...evaluaciones].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.idEvaluacion - b.idEvaluacion);

  for (const evaluacion of cronologicas) {
    for (const resultado of evaluacion.resultados) {
      let grafico = graficos.get(resultado.prueba.id);
      if (!grafico) {
        grafico = {
          pruebaId: resultado.prueba.id,
          nombre: resultado.prueba.nombre,
          categoria: resultado.prueba.categoria,
          unidad: resultado.unidad,
          series: [],
        };
        graficos.set(resultado.prueba.id, grafico);
      }
      grafico.unidad = resultado.unidad; // se muestra la unidad de la medición más reciente
      let serie = grafico.series.find((s) => s.lado === resultado.lado);
      if (!serie) {
        serie = { lado: resultado.lado, puntos: [] };
        grafico.series.push(serie);
      }
      serie.puntos.push({
        evaluacionId: evaluacion.id,
        numero: evaluacion.idEvaluacion,
        fecha: evaluacion.fecha.slice(0, 10),
        valor: Number(resultado.valor),
      });
    }
  }

  // Orden fijo de las series: sin lado, izquierdo, derecho.
  const orden = (lado: Lado | null) => (lado === null ? 0 : lado === "IZQ" ? 1 : 2);
  for (const grafico of graficos.values()) grafico.series.sort((a, b) => orden(a.lado) - orden(b.lado));

  // Orden de los gráficos: primero Fuerza, después Potencia, después el resto; dentro de cada categoría, por nombre.
  return [...graficos.values()].sort(
    (a, b) => ORDEN_CATEGORIA_GRAFICOS[a.categoria] - ORDEN_CATEGORIA_GRAFICOS[b.categoria] || a.nombre.localeCompare(b.nombre),
  );
}

// ---------- Próxima evaluación ----------

export function textoDiasRestantes({ diasRestantes }: ProximaEvaluacion) {
  if (diasRestantes < 0) return `Vencida hace ${-diasRestantes} ${-diasRestantes === 1 ? "día" : "días"}`;
  if (diasRestantes === 0) return "Es hoy";
  return `En ${diasRestantes} ${diasRestantes === 1 ? "día" : "días"}`;
}

// Clase de la insignia: roja si está vencida, amarilla si faltan 14 días o menos.
export function claseProximaEvaluacion({ diasRestantes }: ProximaEvaluacion) {
  if (diasRestantes < 0) return "insignia insignia-alerta";
  if (diasRestantes <= 14) return "insignia insignia-aviso";
  return "insignia";
}
