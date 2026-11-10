import { Lado, OrigenResultado } from "@prisma/client";
import { z } from "zod";
import { esquemaFechaHastaHoy } from "../../lib/fechas";
import { textoANumero, tieneHastaDosDecimales } from "../../lib/montos";

// Acepta número o texto escrito como en Argentina: "32,5", "1.800" (mil ochocientos), "1.800,5".
const valorNumerico = z
  .union([z.number(), z.string().transform(textoANumero)])
  .pipe(
    z
      .number({ error: "Ingresá un número (ej.: 32,5 o 1.800)" })
      .min(0, "El valor no puede ser negativo")
      .max(99_999_999.99, "Valor fuera de rango")
      .refine(tieneHastaDosDecimales, "Hasta 2 decimales (ej.: 32,5)"),
  );

const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Máximo ${maximo} caracteres`)
    .nullish()
    .transform((valor) => valor || null);

const esquemaResultado = z.object({
  pruebaId: z.number({ error: "Elegí una prueba" }).int().positive("Elegí una prueba"),
  valor: valorNumerico,
  // Si no se indica, se usa la unidad de la prueba.
  unidad: textoOpcional(20),
  lado: z
    .enum(Lado)
    .nullish()
    .transform((valor) => valor ?? null),
  origen: z.enum(OrigenResultado).default("MANUAL"),
  observacion: textoOpcional(500),
});

export const esquemaEvaluacion = z
  .object({
    fecha: esquemaFechaHastaHoy,
    observaciones: textoOpcional(2000),
    resultados: z.array(esquemaResultado).min(1, "Cargá al menos un resultado"),
  })
  // La misma prueba (con el mismo lado) no puede cargarse dos veces en una evaluación.
  .superRefine((datos, ctx) => {
    const vistas = new Set<string>();
    datos.resultados.forEach((resultado, indice) => {
      const clave = `${resultado.pruebaId}-${resultado.lado ?? ""}`;
      if (vistas.has(clave)) {
        ctx.addIssue({
          code: "custom",
          path: ["resultados", indice, "pruebaId"],
          message: "Esta prueba ya está cargada (con el mismo lado)",
        });
      }
      vistas.add(clave);
    });
  });

export type DatosEvaluacion = z.infer<typeof esquemaEvaluacion>;
