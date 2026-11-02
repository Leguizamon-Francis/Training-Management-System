-- CreateTable
CREATE TABLE "Asistencia" (
    "id" SERIAL NOT NULL,
    "alumnoId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asistencia_fecha_idx" ON "Asistencia"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Asistencia_alumnoId_fecha_key" ON "Asistencia"("alumnoId", "fecha");

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
