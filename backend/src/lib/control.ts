// Cliente de Prisma de la base de control (gimnasios, usuarios y sesiones; ver prisma/control/schema.prisma).
// Los datos de cada gimnasio NO se leen con este cliente sino con `prisma` (lib/prisma.ts).
import { PrismaClient } from ".prisma/client-control";

export const control = new PrismaClient();
