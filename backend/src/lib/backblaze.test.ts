// Pruebas de la subida a Backblaze, con fetch simulado.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mock, test } from "node:test";
import { subirABackblaze } from "./backblaze";

const credenciales = { idClave: "id", clave: "secreta" };
const datos = Buffer.from("copia cifrada");

function responder(cuerpo: unknown, estado = 200) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }));
}

test("autoriza, pide la dirección de subida y sube el archivo con su SHA-1", async () => {
  const pedidos: { url: string; opciones: RequestInit }[] = [];
  const respuestas = [
    { apiUrl: "https://api.b2", authorizationToken: "token-cuenta", allowed: { bucketId: "bucket-1" } },
    { uploadUrl: "https://subida.b2", authorizationToken: "token-subida" },
    {},
  ];
  const simulado = mock.method(globalThis, "fetch", (url: string, opciones: RequestInit) => {
    pedidos.push({ url, opciones });
    return responder(respuestas[pedidos.length - 1]);
  });
  try {
    await subirABackblaze("dv_training/dv_training-2026-11-04_04-00.dump.cifrado", datos, credenciales);
  } finally {
    simulado.mock.restore();
  }

  const [autorizacion, direccion, subida] = pedidos;
  assert.equal((autorizacion.opciones.headers as Record<string, string>).Authorization, `Basic ${Buffer.from("id:secreta").toString("base64")}`);
  assert.equal(direccion.url, "https://api.b2/b2api/v2/b2_get_upload_url");
  assert.deepEqual(JSON.parse(direccion.opciones.body as string), { bucketId: "bucket-1" });
  const encabezados = subida.opciones.headers as Record<string, string>;
  assert.equal(subida.url, "https://subida.b2");
  assert.equal(encabezados.Authorization, "token-subida");
  assert.equal(encabezados["X-Bz-File-Name"], "dv_training/dv_training-2026-11-04_04-00.dump.cifrado");
  assert.equal(encabezados["X-Bz-Content-Sha1"], crypto.createHash("sha1").update(datos).digest("hex"));
});

test("una clave que no está limitada a un bucket se rechaza", async () => {
  const simulado = mock.method(globalThis, "fetch", () =>
    responder({ apiUrl: "https://api.b2", authorizationToken: "t", allowed: { bucketId: null } }),
  );
  try {
    await assert.rejects(subirABackblaze("copia", datos, credenciales), /limitada a un bucket/);
  } finally {
    simulado.mock.restore();
  }
});

test("un error de Backblaze se informa con su mensaje", async () => {
  const simulado = mock.method(globalThis, "fetch", () => responder({ message: "bad auth token" }, 401));
  try {
    await assert.rejects(subirABackblaze("copia", datos, credenciales), /\(autorización\): bad auth token \[401\]/);
  } finally {
    simulado.mock.restore();
  }
});
