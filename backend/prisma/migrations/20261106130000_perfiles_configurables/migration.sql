-- Los perfiles dejan de ser fijos (enum) y pasan a una tabla que se edita desde Configuración.
-- Se crean "Deportivo" (2 meses) y "Salud" (4 meses), con los mismos plazos de reevaluación de antes,
-- y cada alumno queda con el mismo perfil que tenía.

-- La tabla nueva se llama igual que el enum viejo: primero se renombra el enum.
ALTER TYPE "Perfil" RENAME TO "Perfil_viejo";

CREATE TABLE "Perfil" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "mesesReevaluacion" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Perfil_nombre_key" ON "Perfil"("nombre");

INSERT INTO "Perfil" ("nombre", "mesesReevaluacion", "actualizadoEn") VALUES
    ('Deportivo', 2, CURRENT_TIMESTAMP),
    ('Salud', 4, CURRENT_TIMESTAMP);

ALTER TABLE "Alumno" ADD COLUMN "perfilId" INTEGER;

UPDATE "Alumno" AS a
SET "perfilId" = p."id"
FROM "Perfil" AS p
WHERE p."nombre" = CASE a."perfil" WHEN 'DEPORTIVO' THEN 'Deportivo' ELSE 'Salud' END;

ALTER TABLE "Alumno" ALTER COLUMN "perfilId" SET NOT NULL;
ALTER TABLE "Alumno" DROP COLUMN "perfil";
DROP TYPE "Perfil_viejo";

ALTER TABLE "Alumno" ADD CONSTRAINT "Alumno_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- El historial de cambios guardaba el código del enum: desde ahora guarda el nombre del perfil.
UPDATE "CambioAlumno" SET
    "valorAnterior" = CASE "valorAnterior" WHEN 'DEPORTIVO' THEN 'Deportivo' WHEN 'SALUD' THEN 'Salud'
        WHEN 'RECUPERACION' THEN 'Recuperación / post lesión' ELSE "valorAnterior" END,
    "valorNuevo" = CASE "valorNuevo" WHEN 'DEPORTIVO' THEN 'Deportivo' WHEN 'SALUD' THEN 'Salud'
        WHEN 'RECUPERACION' THEN 'Recuperación / post lesión' ELSE "valorNuevo" END
WHERE "campo" = 'perfil';
