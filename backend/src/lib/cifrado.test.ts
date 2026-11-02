// Pruebas del cifrado de las copias de seguridad.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cifrar, descifrar } from "./cifrado";

const datos = Buffer.from("datos personales de prueba");

test("cifrar y descifrar devuelve lo mismo", () => {
  assert.deepEqual(descifrar(cifrar(datos, "clave-larga"), "clave-larga"), datos);
});

test("el contenido cifrado no incluye el texto original", () => {
  assert.equal(cifrar(datos, "clave-larga").includes(datos), false);
});

test("una clave incorrecta no descifra", () => {
  assert.throws(() => descifrar(cifrar(datos, "clave-larga"), "otra-clave"), /clave es incorrecta/);
});

test("un archivo modificado no se descifra", () => {
  const cifrado = cifrar(datos, "clave-larga");
  cifrado[cifrado.length - 1] ^= 1;
  assert.throws(() => descifrar(cifrado, "clave-larga"), /dañado/);
});

test("un archivo que no es una copia cifrada se rechaza", () => {
  assert.throws(() => descifrar(datos, "clave-larga"), /no es una copia cifrada/);
});
