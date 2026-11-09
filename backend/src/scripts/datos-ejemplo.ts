// Carga datos inventados para probar el sistema o grabar una demostración, sin usar datos reales.
// Uso (desde la carpeta backend):  npm run datos-ejemplo -- <base del gimnasio>  (con el servidor de .env.prueba)
// El gimnasio tiene que existir (npm run centros -- crear). Por seguridad solo funciona fuera de producción
// y si el nombre de la base contiene "prueba". Para el gimnasio demo de producción: npm run datos-demo.
import { clienteDeCentro, desconectarCentros, enCentro } from "../lib/centros";
import { control } from "../lib/control";
import { hashearPassword } from "../modulos/auth/auth.service";
import { cargarDatosFicticios } from "./datos-ficticios";

const EMAIL_DEMO = "demo@dvtraining.test";
const PASSWORD_DEMO = "demo-1234";

async function main() {
  const base = process.argv[2] ?? "";
  if (process.env.NODE_ENV === "production" || !base.includes("prueba")) {
    throw new Error(`La base "${base}" no parece de prueba: no se cargan datos de ejemplo.`);
  }
  const centro = await control.centro.findUnique({ where: { baseDatos: base } });
  if (!centro) throw new Error(`No hay ningún gimnasio con la base "${base}" (npm run centros -- listar).`);

  // El usuario va en la base de control, unido a este gimnasio.
  const existente = await control.usuario.findUnique({ where: { email: EMAIL_DEMO } });
  if (existente && existente.centroId !== centro.id) throw new Error(`${EMAIL_DEMO} ya es usuario de otro gimnasio.`);
  if (!existente) {
    await control.usuario.create({
      data: { email: EMAIL_DEMO, nombre: "Demo", passwordHash: await hashearPassword(PASSWORD_DEMO), centroId: centro.id },
    });
  }

  const creados = await enCentro(clienteDeCentro(base), cargarDatosFicticios);
  console.log(`${creados} alumnos de ejemplo cargados en "${base}". Usuario: ${EMAIL_DEMO} / contraseña: ${PASSWORD_DEMO}`);
}

main()
  .catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([control.$disconnect(), desconectarCentros()]));
