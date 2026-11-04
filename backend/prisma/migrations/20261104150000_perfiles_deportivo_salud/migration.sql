-- Los perfiles son solo Deportivo y Salud. Quien tenía "Recuperación / post lesión" pasa a Deportivo
-- (se reevalúa cada 2 meses, igual que antes) y el dato queda al principio de su detalle del perfil.
UPDATE "Alumno"
SET "perfil" = 'DEPORTIVO',
    "detallePerfil" = 'Recuperación / post lesión' || COALESCE(': ' || NULLIF("detallePerfil", ''), '')
WHERE "perfil" = 'RECUPERACION';

BEGIN;
CREATE TYPE "Perfil_new" AS ENUM ('DEPORTIVO', 'SALUD');
ALTER TABLE "Alumno" ALTER COLUMN "perfil" TYPE "Perfil_new" USING ("perfil"::text::"Perfil_new");
ALTER TYPE "Perfil" RENAME TO "Perfil_old";
ALTER TYPE "Perfil_new" RENAME TO "Perfil";
DROP TYPE "Perfil_old";
COMMIT;
