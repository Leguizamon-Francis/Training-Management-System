-- Pruebas eliminadas que tenían resultados: no se borran (los resultados las necesitan), se ocultan del catálogo.
ALTER TABLE "Prueba" ADD COLUMN "eliminada" BOOLEAN NOT NULL DEFAULT false;
