// Montos en pesos. Se calculan con Prisma.Decimal (decimal exacto), nunca con float:
// en float 0.1 + 0.2 = 0.30000000000000004, y con plata eso no puede pasar.
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Para mensajes de error: "$ 25.000,00".
export function formatearMoneda(monto: Prisma.Decimal) {
  return Number(monto).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

// Convierte un número escrito como en Argentina (importes, resultados de evaluaciones):
// "25.000" → 25000 | "25.000,50" → 25000.5 | "25000,5" → 25000.5 | "25000.50" → 25000.5
export function textoANumero(texto: string) {
  const limpio = texto.replace(/[\s$]/g, "");
  if (limpio === "") return Number.NaN;
  if (limpio.includes(",")) {
    // Con coma decimal: los puntos son separadores de miles. Después de la coma van hasta 2 dígitos: "25,000" es
    // casi seguro la coma usada para los miles (se leería 25), así que no se acepta.
    if (!/^-?[\d.]*,\d{1,2}$/.test(limpio)) return Number.NaN;
    return Number(limpio.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    // Solo puntos en grupos de 3 ("25.000", "1.500.000"): son separadores de miles.
    return Number(limpio.replace(/\./g, ""));
  }
  return Number(limpio);
}

// Hasta 2 decimales (centavos): con más, se rechaza en lugar de redondear sin avisar.
export function tieneHastaDosDecimales(numero: number) {
  return Math.abs(numero * 100 - Math.round(numero * 100)) < 1e-6;
}

// Importe positivo con hasta 2 decimales. Acepta número o texto.
export const esquemaImporte = z
  .union([z.number(), z.string().transform(textoANumero)], { error: "Ingresá un importe" })
  .pipe(
    z
      .number({ error: "Ingresá un importe válido (ej.: 25.000 o 25.000,50)" })
      .positive("El importe debe ser mayor a cero")
      .max(9_999_999_999.99, "Importe demasiado grande")
      .refine(tieneHastaDosDecimales, "Hasta 2 decimales (ej.: 25.000,50)"),
  )
  .transform((importe) => new Prisma.Decimal(importe.toFixed(2)));
