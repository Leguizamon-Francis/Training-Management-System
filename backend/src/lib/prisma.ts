// `prisma` apunta siempre a la base del gimnasio del pedido en curso (ver lib/centros.ts).
// Los módulos lo usan igual que un cliente de Prisma común: prisma.alumno.findMany(), prisma.$transaction()...
// Fuera de un gimnasio (sin enCentro), cualquier uso da error.
import type { PrismaClient } from "@prisma/client";
import { clienteActual } from "./centros";

export const prisma = new Proxy({} as PrismaClient, {
  get(_objeto, propiedad) {
    const cliente = clienteActual();
    const valor = Reflect.get(cliente, propiedad, cliente);
    return typeof valor === "function" ? valor.bind(cliente) : valor;
  },
});
