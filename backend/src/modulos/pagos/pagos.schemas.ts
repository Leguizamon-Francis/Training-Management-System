import { MedioPago } from "@prisma/client";
import { z } from "zod";
import { hoyComoTexto } from "../../lib/fechas";
import { esquemaImporte } from "../../lib/montos";

const fechaPago = z.iso
  .date("Fecha inválida")
  .refine((fecha) => fecha <= hoyComoTexto(), "La fecha no puede ser futura");

const medio = z.enum(MedioPago, { error: "Elegí el medio de pago" });

const concepto = z
  .string({ error: "Indicá el concepto" })
  .trim()
  .min(1, "Indicá el concepto")
  .max(200, "Máximo 200 caracteres");

export const esquemaPago = z.discriminatedUnion(
  "tipo",
  [
    // La cuota se paga completa: "importe" es lo que vale (el frontend propone el precio del plan).
    z.object({
      tipo: z.literal("CUOTA"),
      fecha: fechaPago,
      importe: esquemaImporte,
      medio,
    }),
    z.object({
      tipo: z.literal("OTRO"),
      fecha: fechaPago,
      importe: esquemaImporte,
      concepto,
      medio,
    }),
  ],
  { error: "Elegí el tipo de pago" },
);

export type DatosPago = z.infer<typeof esquemaPago>;

// PUT /api/pagos/:id  El concepto solo se usa en los pagos por otro concepto.
export const esquemaCorreccionPago = z.object({
  fecha: fechaPago,
  importe: esquemaImporte,
  medio,
  concepto: concepto.optional(),
});

export type CorreccionPago = z.infer<typeof esquemaCorreccionPago>;

// GET /api/pagos/ultimos?cantidad=20
export const esquemaUltimosPagos = z.object({
  cantidad: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/pagos/ingresos?desde=aaaa-mm-dd&hasta=aaaa-mm-dd
export const esquemaRangoIngresos = z
  .object({
    desde: z.iso.date("Fecha inválida"),
    hasta: z.iso.date("Fecha inválida"),
  })
  .refine((rango) => rango.desde <= rango.hasta, {
    message: "La fecha inicial no puede ser posterior a la final",
    path: ["hasta"],
  });
