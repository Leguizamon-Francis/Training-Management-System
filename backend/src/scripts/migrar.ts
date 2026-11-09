// Aplica las migraciones pendientes: primero en la base de control y después en la base de CADA gimnasio.
// Es el paso previo a cada publicación (npm run migrar). Si una base falla, se corta y la publicación no sigue.
// Uso (desde la carpeta backend):  npm run db:deploy
import { control } from "../lib/control";
import { asegurarBase, migrarCentro, migrarControl } from "./herramientas-centros";

async function main() {
  console.log("Base de control:");
  const baseControl = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
  if (await asegurarBase(baseControl)) console.log(`Base ${baseControl} creada.`);
  migrarControl();

  const centros = await control.centro.findMany({ orderBy: { id: "asc" } });
  for (const centro of centros) {
    console.log(`\nGimnasio "${centro.nombre}" (base ${centro.baseDatos}):`);
    migrarCentro(centro.baseDatos);
  }
  console.log(`\nListo: base de control y ${centros.length} ${centros.length === 1 ? "gimnasio" : "gimnasios"}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => control.$disconnect());
