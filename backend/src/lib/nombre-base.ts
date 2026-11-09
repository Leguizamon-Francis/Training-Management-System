// El nombre de la base de un gimnasio va en direcciones de conexión, en CREATE DATABASE y en nombres de archivo
// (respaldos): solo minúsculas, números y "_", empezando con una letra. Sin dependencias, para poder usarlo en
// scripts que no cargan Prisma (respaldo.ts).
const NOMBRE_BASE_VALIDO = /^[a-z][a-z0-9_]{0,62}$/;

export function validarNombreBase(nombre: string) {
  if (!NOMBRE_BASE_VALIDO.test(nombre)) {
    throw new Error(`Nombre de base inválido: "${nombre}" (solo minúsculas, números y "_", empezando con una letra).`);
  }
}
