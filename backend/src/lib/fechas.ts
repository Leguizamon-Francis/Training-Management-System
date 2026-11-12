// Las fechas de calendario viajan como texto "aaaa-mm-dd" y se guardan como DATE (sin hora).
// Se usan siempre a las 00:00 UTC para que la zona horaria no corra el día.
import { z } from "zod";

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function fechaDesdeTexto(texto: string) {
  return new Date(`${texto}T00:00:00.000Z`);
}

export function textoDesdeFecha(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

// Día calendario en Argentina de un momento (ej.: creadoEn), como "aaaa-mm-dd".
// El formato en-CA es justamente "aaaa-mm-dd".
export function fechaArgentina(momento: Date) {
  return momento.toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });
}

// Fecha de hoy en Argentina, como "aaaa-mm-dd".
export function hoyComoTexto() {
  return fechaArgentina(new Date());
}

// "aaaa-mm-dd" → "dd-mm-aaaa", para textos que se guardan para mostrar (ej.: historial de cambios).
export function formatearFechaTexto(texto: string) {
  const [anio, mes, dia] = texto.split("-");
  return `${dia}-${mes}-${anio}`;
}

// Suma meses respetando el fin de mes: 31-01 + 1 mes = 28-02 (o 29-02 en bisiesto).
export function sumarMeses(texto: string, meses: number) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  const mesesTotales = mes - 1 + meses;
  const anioNuevo = anio + Math.floor(mesesTotales / 12);
  const mesNuevo = mesesTotales % 12; // 0 = enero
  const ultimoDiaDelMes = new Date(Date.UTC(anioNuevo, mesNuevo + 1, 0)).getUTCDate();
  return textoDesdeFecha(new Date(Date.UTC(anioNuevo, mesNuevo, Math.min(dia, ultimoDiaDelMes))));
}

export function sumarDias(texto: string, dias: number) {
  const fecha = fechaDesdeTexto(texto);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return textoDesdeFecha(fecha);
}

// Años cumplidos a una fecha (por defecto, hoy). Los textos "aaaa-mm-dd" se pueden comparar directamente.
export function calcularEdad(nacimiento: string, hoy = hoyComoTexto()) {
  const anios = Number(hoy.slice(0, 4)) - Number(nacimiento.slice(0, 4));
  return hoy.slice(5) >= nacimiento.slice(5) ? anios : anios - 1;
}

// Días desde una fecha hasta otra (negativo si "hasta" ya pasó).
export function diasEntre(desde: string, hasta: string) {
  return Math.round((fechaDesdeTexto(hasta).getTime() - fechaDesdeTexto(desde).getTime()) / MS_POR_DIA);
}

// Fecha de algo que ya pasó (pagos, evaluaciones, anotaciones, asistencias): no puede ser futura, y una anterior
// al 2000 es casi seguro un error de tipeo en el año.
export const esquemaFechaHastaHoy = z.iso
  .date("Fecha inválida")
  .refine((fecha) => fecha >= "2000-01-01", "Revisá el año de la fecha")
  .refine((fecha) => fecha <= hoyComoTexto(), "La fecha no puede ser futura");
