-- CreateTable
CREATE TABLE "PlantillaRutina" (
    "tipo" "TipoBloque" NOT NULL,
    "pdf" BYTEA NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaRutina_pkey" PRIMARY KEY ("tipo")
);
