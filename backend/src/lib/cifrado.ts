// Cifrado de archivos con contraseña (AES-256-GCM, de la librería estándar de Node).
// GCM además detecta si el archivo se modificó o si la contraseña es incorrecta: descifrar falla.
import crypto from "node:crypto";

const MARCA = Buffer.from("GPE1"); // identifica el formato: marca + sal + iv + etiqueta + datos
const LARGO_SAL = 16;
const LARGO_IV = 12;
const LARGO_ETIQUETA = 16;

// scrypt deriva una clave de 32 bytes y hace lento adivinar la contraseña por fuerza bruta.
function derivarClave(clave: string, sal: Buffer) {
  return crypto.scryptSync(clave, sal, 32);
}

// Clave propia de cada base, derivada de la clave maestra (RESPALDO_CLAVE) con HKDF: así la copia de un gimnasio
// no se abre con la clave de otro, sin tener que guardar una clave por gimnasio. Con la maestra se pueden volver
// a calcular todas.
export function claveDeBase(claveMaestra: string, baseDatos: string) {
  return Buffer.from(crypto.hkdfSync("sha256", claveMaestra, "dv-training-respaldos", `base:${baseDatos}`, 32)).toString("hex");
}

export function cifrar(datos: Buffer, clave: string) {
  const sal = crypto.randomBytes(LARGO_SAL);
  const iv = crypto.randomBytes(LARGO_IV);
  const cifrador = crypto.createCipheriv("aes-256-gcm", derivarClave(clave, sal), iv);
  const cifrado = Buffer.concat([cifrador.update(datos), cifrador.final()]);
  return Buffer.concat([MARCA, sal, iv, cifrador.getAuthTag(), cifrado]);
}

export function descifrar(contenido: Buffer, clave: string) {
  if (!contenido.subarray(0, MARCA.length).equals(MARCA)) {
    throw new Error("El archivo no es una copia cifrada");
  }
  let posicion = MARCA.length;
  const tomar = (largo: number) => contenido.subarray(posicion, (posicion += largo));
  const sal = tomar(LARGO_SAL);
  const iv = tomar(LARGO_IV);
  const etiqueta = tomar(LARGO_ETIQUETA);
  const descifrador = crypto.createDecipheriv("aes-256-gcm", derivarClave(clave, sal), iv);
  descifrador.setAuthTag(etiqueta);
  try {
    return Buffer.concat([descifrador.update(contenido.subarray(posicion)), descifrador.final()]);
  } catch {
    throw new Error("No se pudo descifrar: la clave es incorrecta o el archivo está dañado");
  }
}
