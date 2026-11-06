-- Links de recuperación de contraseña ("¿Olvidaste tu contraseña?").
CREATE TABLE "RecuperacionPassword" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecuperacionPassword_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecuperacionPassword_tokenHash_key" ON "RecuperacionPassword"("tokenHash");

CREATE INDEX "RecuperacionPassword_usuarioId_idx" ON "RecuperacionPassword"("usuarioId");

ALTER TABLE "RecuperacionPassword" ADD CONSTRAINT "RecuperacionPassword_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
