-- AlterTable
ALTER TABLE "Rutina" ADD COLUMN     "alumnoEditoEn" TIMESTAMP(3),
ADD COLUMN     "edicionesAlumno" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "linkAlumno" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Rutina_linkAlumno_key" ON "Rutina"("linkAlumno");

