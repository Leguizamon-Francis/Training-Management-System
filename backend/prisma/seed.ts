// Datos iniciales. Se puede ejecutar varias veces sin duplicar (usa upsert).
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Catálogo inicial de pruebas (después se agregan o desactivan desde el sistema).
const pruebas: Prisma.PruebaCreateInput[] = [
  { nombre: "IMTP (tirón isométrico a mitad de muslo)", categoria: "FUERZA", unidad: "N" },
  { nombre: "CMJ (salto con contramovimiento)", categoria: "POTENCIA", unidad: "cm" },
  { nombre: "DJ (salto en caída)", categoria: "POTENCIA", unidad: "cm" },
  { nombre: "Movilidad de tobillo (rodilla a la pared)", categoria: "MOVILIDAD", unidad: "cm", porLado: true },
  { nombre: "Rango de movimiento de cadera", categoria: "MOVILIDAD", unidad: "°" },
];

// Un plan fijo por modalidad. Se crean con precio 0: cada precio se define desde Membresías → Configurar Membresías.
const planes: Prisma.PlanCreateInput[] = [
  { modalidad: "PRESENCIAL", nombre: "Presencial", precioMensual: 0 },
  { modalidad: "SEMIPRESENCIAL", nombre: "Semi presencial", precioMensual: 0 },
  { modalidad: "ONLINE", nombre: "Online", precioMensual: 0 },
  { modalidad: "OTRO", nombre: "Otro", precioMensual: 0 },
];

async function main() {
  for (const prueba of pruebas) {
    await prisma.prueba.upsert({
      where: { nombre: prueba.nombre },
      update: {},
      create: prueba,
    });
  }
  console.log(`Catálogo de pruebas cargado (${pruebas.length} pruebas).`);

  // update vacío: si el plan ya existe, no se le pisa el precio.
  for (const plan of planes) {
    await prisma.plan.upsert({ where: { modalidad: plan.modalidad }, update: {}, create: plan });
  }
  console.log(`Planes cargados (${planes.length}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
