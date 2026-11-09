-- Los usuarios, sesiones y links de recuperación pasan a la base de control (prisma/control).
-- El script centros:adoptar los copia allá ANTES de aplicar esta migración en una base existente.
DROP TABLE "RecuperacionPassword";
DROP TABLE "Sesion";
DROP TABLE "Usuario";
DROP TYPE "Rol";
