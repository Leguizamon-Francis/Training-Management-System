-- Los modelos de rutina reemplazan a los bloques para las rutinas nuevas.
-- Los valores viejos se conservan porque hay rutinas guardadas con ellos.
ALTER TYPE "TipoBloque" ADD VALUE 'MODELO_RUTINA';
ALTER TYPE "TipoBloque" ADD VALUE 'MODELO_RUTINA_2';
