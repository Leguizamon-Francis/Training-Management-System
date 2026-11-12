// Estructura de la "Planilla 6 semanas": qué campo del PDF guarda cada dato. La usan el generador del PDF
// (scripts/generar-plantillas.ts) y la vista del celular para el alumno (rutina-alumno.service.ts), así las dos
// siempre coinciden.
//
// Un día por hoja. Cada ejercicio ocupa dos renglones: series, repeticiones, RPE y kilos se anotan en cada renglón;
// las demás columnas abarcan los dos. Los campos se llaman como la celda del Excel (A3, C3, F4, AO3…), con su número
// de fila aunque cada día vaya en su hoja.

export const SEMANAS = 6;

type ClaveSemana = "series" | "reps" | "rpe" | "kgsSugeridos" | "kgs" | "anotaciones" | "correcciones";

// Columnas que se repiten en cada semana. unaPorEjercicio: un solo campo para los dos renglones.
export const COLUMNAS_SEMANA: { clave: ClaveSemana; titulo: string; ancho: number; unaPorEjercicio?: boolean }[] = [
  { clave: "series", titulo: "SERIES", ancho: 34 },
  { clave: "reps", titulo: "REPS", ancho: 34 },
  { clave: "rpe", titulo: "RPE (GRADO DE ESFUERZO)", ancho: 44 },
  { clave: "kgsSugeridos", titulo: "KGS SUGERIDOS PARA EL EJERCICIO", ancho: 46 },
  { clave: "kgs", titulo: "KGS (ANOTA ACA)", ancho: 40 },
  { clave: "anotaciones", titulo: "ANOTACIONES DEL ALUMNO", ancho: 80, unaPorEjercicio: true },
  { clave: "correcciones", titulo: "CORRECCIONES", ancho: 80, unaPorEjercicio: true },
];

// Columnas A a E: descansos, número, ejercicio, notas y RM anteriores.
export const ANCHOS_INICIO = [52, 22, 150, 170, 46];

// Fila del encabezado de cada día en el Excel y cuántos ejercicios abarca cada descanso (columna A).
// En el Excel el quinto día también dice "Dia 4".
export const DIAS = [
  { titulo: "Dia 1", fila: 1, descansos: [1, 1, 1, 1, 1, 2] },
  { titulo: "Dia 2", fila: 18, descansos: [1, 1, 1, 1, 1, 2] },
  { titulo: "Dia 3", fila: 35, descansos: [1, 1, 1, 2, 1, 2] },
  { titulo: "Dia 4", fila: 54, descansos: [1, 1, 1, 1, 1, 1, 2] },
  { titulo: "Dia 5", fila: 73, descansos: [1, 1, 1, 1, 1, 1, 2] },
];

// Letras de columna como en el Excel: 0 → A, 25 → Z, 26 → AA.
export function columnaExcel(indice: number): string {
  const letra = String.fromCharCode(65 + (indice % 26));
  return indice < 26 ? letra : columnaExcel(Math.floor(indice / 26) - 1) + letra;
}

export interface EjercicioPlanilla {
  descanso: string; // campo de la columna A (lo comparten los ejercicios del mismo descanso)
  numero: string;
  ejercicio: string;
  notas: string;
  rm: string;
  // Por semana: los campos de cada columna. Las de dos renglones tienen dos campos; las demás, uno.
  semanas: Record<ClaveSemana, string[]>[];
}

export interface DiaPlanilla {
  titulo: string;
  ejercicios: EjercicioPlanilla[];
}

// Los nombres de los campos de cada día y ejercicio, en el orden de la planilla.
export function estructuraPlanilla6Semanas(): DiaPlanilla[] {
  return DIAS.map((dia) => {
    const ejercicios: EjercicioPlanilla[] = [];
    let fila = dia.fila + 2; // los ejercicios empiezan dos filas debajo del encabezado del día
    for (const cantidad of dia.descansos) {
      const descanso = `A${fila}`;
      for (let e = 0; e < cantidad; e++) {
        const semanas = Array.from({ length: SEMANAS }, (_, semana) => {
          const campos = {} as Record<ClaveSemana, string[]>;
          COLUMNAS_SEMANA.forEach((columna, i) => {
            const letra = columnaExcel(ANCHOS_INICIO.length + semana * COLUMNAS_SEMANA.length + i);
            campos[columna.clave] = columna.unaPorEjercicio ? [`${letra}${fila}`] : [`${letra}${fila}`, `${letra}${fila + 1}`];
          });
          return campos;
        });
        ejercicios.push({ descanso, numero: `B${fila}`, ejercicio: `C${fila}`, notas: `D${fila}`, rm: `E${fila}`, semanas });
        fila += 2;
      }
    }
    return { titulo: dia.titulo, ejercicios };
  });
}

// Todos los campos que aparecen en la vista del alumno (todos los de los días; no nombre, edad ni deporte).
export function camposDeLosDias(dias: DiaPlanilla[]) {
  const campos = new Set<string>();
  for (const dia of dias) {
    for (const { semanas, ...fijos } of dia.ejercicios) {
      Object.values(fijos).forEach((campo) => campos.add(campo));
      semanas.forEach((semana) => Object.values(semana).flat().forEach((campo) => campos.add(campo)));
    }
  }
  return campos;
}
