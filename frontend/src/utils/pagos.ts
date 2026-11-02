import type { EstadoCuota, MedioPago } from "../api/pagos";
import { formatearFecha, formatearMoneda } from "./formato";
import { linkChatWhatsApp } from "./whatsapp";

// Precio de un plan para mostrar. Los planes nacen con precio 0 hasta que se define.
export function textoPrecioPlan(precio: string) {
  return Number(precio) > 0 ? formatearMoneda(precio) : "sin precio definido";
}

export const ETIQUETAS_MEDIO: Record<MedioPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

export const ETIQUETAS_ESTADO_CUOTA: Record<EstadoCuota, string> = {
  VENCIDA: "Vencida",
  POR_VENCER: "Por vencer",
  AL_DIA: "Al día",
  SIN_PAGOS: "Sin pagos",
};

export function claseEstadoCuota(estado: EstadoCuota) {
  if (estado === "VENCIDA") return "insignia insignia-alerta";
  if (estado === "POR_VENCER") return "insignia insignia-aviso";
  if (estado === "AL_DIA") return "insignia insignia-ok";
  return "insignia";
}

// Texto del vencimiento, ej.: "Venció el 30-09-2026 (hace 13 días)". Sin pagos devuelve "" (ya lo dice la etiqueta "Sin pagos").
export function textoVencimiento(estado: EstadoCuota, vence: string | null, diasRestantes: number | null) {
  if (!vence || diasRestantes === null) return "";
  const fecha = formatearFecha(vence);
  if (diasRestantes < 0) {
    const dias = -diasRestantes;
    return `Venció el ${fecha} (hace ${dias} ${dias === 1 ? "día" : "días"})`;
  }
  if (diasRestantes === 0) return `Vence hoy (${fecha})`;
  if (estado === "POR_VENCER") return `Vence el ${fecha} (en ${diasRestantes} ${diasRestantes === 1 ? "día" : "días"})`;
  return `Hasta el ${fecha}`; // la etiqueta "Al día" ya está al lado
}

// Importe listo para editar en un campo de texto: "25000.5" → "25.000,50".
export function importeParaEditar(importe: string | number) {
  return Number(importe).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- WhatsApp ----------

interface DatosAviso {
  nombre: string;
  telefono: string; // 10 dígitos: código de área + número
  estado: EstadoCuota;
  vence: string | null;
  diasRestantes: number | null;
  deudaTotal: string;
  cantidadAdeudadas: number;
}

// Hace falta avisar si la cuota está vencida o por vencer, o si nunca pagó.
export function requiereAviso(estado: EstadoCuota) {
  return estado !== "AL_DIA";
}

function mensajeWhatsApp({ nombre, estado, vence, diasRestantes, deudaTotal, cantidadAdeudadas }: DatosAviso) {
  const partes = [`Hola ${nombre}, ¿cómo estás?`];
  if (estado === "VENCIDA" && vence) partes.push(`Te recuerdo que tu cuota venció el ${formatearFecha(vence)}.`);
  if (estado === "POR_VENCER" && vence) {
    partes.push(diasRestantes === 0 ? "Te recuerdo que tu cuota vence hoy." : `Te recuerdo que tu cuota vence el ${formatearFecha(vence)}.`);
  }
  if (estado === "SIN_PAGOS") partes.push("Te escribo por el pago de la cuota.");
  const total = Number(deudaTotal) > 0 ? ` (total: ${formatearMoneda(deudaTotal)})` : "";
  if (cantidadAdeudadas > 1) partes.push(`Tenés ${cantidadAdeudadas} cuotas sin pagar${total}.`);
  else if (cantidadAdeudadas === 1 && Number(deudaTotal) > 0) partes.push(`El importe es de ${formatearMoneda(deudaTotal)}.`);
  partes.push("¡Gracias!");
  return partes.join(" ");
}

export function linkWhatsApp(datos: DatosAviso) {
  return linkChatWhatsApp(datos.telefono, mensajeWhatsApp(datos));
}
