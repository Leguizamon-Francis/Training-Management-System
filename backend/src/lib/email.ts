// Envía un mail con la API de Resend (https://resend.com/docs/api-reference/emails/send-email).
// Se usa solo para "¿Olvidaste tu contraseña?".
interface Mail {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

interface Configuracion {
  clave: string;
  remitente: string; // "Nombre <direccion@dominio>": el dominio tiene que estar verificado en Resend
}

export async function enviarEmail({ para, asunto, texto, html }: Mail, { clave, remitente }: Configuracion) {
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remitente, to: [para], subject: asunto, text: texto, html }),
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(`Resend: ${cuerpo?.message ?? respuesta.statusText} [${respuesta.status}]`);
  }
}

// Para meter texto en el HTML del mail sin que se interprete como etiquetas.
export function escaparHtml(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
