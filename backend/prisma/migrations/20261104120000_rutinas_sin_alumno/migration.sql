-- Una rutina puede no tener alumno: las que se arman para alguien que no es alumno.
ALTER TABLE "Rutina" ALTER COLUMN "alumnoId" DROP NOT NULL;
