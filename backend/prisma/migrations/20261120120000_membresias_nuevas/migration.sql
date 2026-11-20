-- Membresías agregadas por el gimnasio: no tienen modalidad (las 4 del seed la conservan).
ALTER TABLE "Plan" ALTER COLUMN "modalidad" DROP NOT NULL;
