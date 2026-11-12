// Sube un archivo a Backblaze B2 con su API nativa (https://www.backblaze.com/apidocs).
// Alcanza con una clave de solo escritura limitada a un bucket: quien tenga la clave puede subir copias,
// pero no leerlas ni borrarlas. Las copias viejas las borra una regla de ciclo de vida del bucket.
import crypto from "node:crypto";

interface Credenciales {
  idClave: string;
  clave: string;
}

// Errores pasajeros de B2 (servidor ocupado o lleno, demora): según su documentación se pide otra
// dirección de subida y se vuelve a intentar.
const REINTENTOS_SUBIDA = 4;
const ESTADOS_PASAJEROS = new Set([408, 429, 500, 503]);

class ErrorB2 extends Error {
  constructor(mensaje: string, readonly pasajero: boolean) {
    super(mensaje);
  }
}

async function pedirB2<T>(url: string, opciones: RequestInit, paso: string): Promise<T> {
  const respuesta = await fetch(url, opciones).catch((error) => {
    // Sin respuesta (conexión cortada, DNS): también vale reintentar.
    throw new ErrorB2(`Backblaze (${paso}): ${error instanceof Error ? error.message : error}`, true);
  });
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorB2(
      `Backblaze (${paso}): ${cuerpo?.message ?? respuesta.statusText} [${respuesta.status}]`,
      ESTADOS_PASAJEROS.has(respuesta.status),
    );
  }
  return cuerpo as T;
}

export async function subirABackblaze(nombre: string, datos: Buffer, credenciales: Credenciales) {
  for (let intento = 1; ; intento++) {
    try {
      return await intentarSubida(nombre, datos, credenciales);
    } catch (error) {
      if (!(error instanceof ErrorB2) || !error.pasajero || intento === REINTENTOS_SUBIDA) throw error;
      const espera = 5 * 2 ** (intento - 1); // 5, 10, 20 segundos
      console.log(`${error.message}. Reintento ${intento} de ${REINTENTOS_SUBIDA - 1} en ${espera} s…`);
      await new Promise((listo) => setTimeout(listo, espera * 1000));
    }
  }
}

async function intentarSubida(nombre: string, datos: Buffer, { idClave, clave }: Credenciales) {
  const cuenta = await pedirB2<{ apiUrl: string; authorizationToken: string; allowed: { bucketId: string | null } }>(
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
    { headers: { Authorization: `Basic ${Buffer.from(`${idClave}:${clave}`).toString("base64")}` } },
    "autorización",
  );
  const bucketId = cuenta.allowed.bucketId;
  if (!bucketId) throw new Error("La clave de Backblaze tiene que estar limitada a un bucket.");

  const destino = await pedirB2<{ uploadUrl: string; authorizationToken: string }>(
    `${cuenta.apiUrl}/b2api/v2/b2_get_upload_url`,
    { method: "POST", headers: { Authorization: cuenta.authorizationToken }, body: JSON.stringify({ bucketId }) },
    "dirección de subida",
  );

  await pedirB2(
    destino.uploadUrl,
    {
      method: "POST",
      headers: {
        Authorization: destino.authorizationToken,
        // Cada parte codificada por separado: la "/" queda tal cual y B2 la muestra como carpeta.
        "X-Bz-File-Name": nombre.split("/").map(encodeURIComponent).join("/"),
        "Content-Type": "application/octet-stream",
        "X-Bz-Content-Sha1": crypto.createHash("sha1").update(datos).digest("hex"),
      },
      body: new Uint8Array(datos),
    },
    "subida",
  );
}
