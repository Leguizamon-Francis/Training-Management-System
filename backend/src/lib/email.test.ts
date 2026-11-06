// Pruebas del envío de mails, con fetch simulado.
import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { enviarEmail, escaparHtml } from "./email";

const mail = { para: "profe@ejemplo.com", asunto: "Asunto", texto: "Hola", html: "<p>Hola</p>" };
const configuracion = { clave: "re_secreta", remitente: "DV Training <no-responder@ejemplo.com>" };

test("manda el mail a Resend con la clave y los datos", async () => {
  let pedido: { url: string; opciones: RequestInit } | null = null;
  const simulado = mock.method(globalThis, "fetch", (url: string, opciones: RequestInit) => {
    pedido = { url, opciones };
    return Promise.resolve(new Response(JSON.stringify({ id: "1" }), { status: 200 }));
  });
  try {
    await enviarEmail(mail, configuracion);
  } finally {
    simulado.mock.restore();
  }
  assert.ok(pedido);
  const { url, opciones } = pedido as { url: string; opciones: RequestInit };
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal((opciones.headers as Record<string, string>).Authorization, "Bearer re_secreta");
  assert.deepEqual(JSON.parse(opciones.body as string), {
    from: configuracion.remitente,
    to: [mail.para],
    subject: mail.asunto,
    text: mail.texto,
    html: mail.html,
  });
});

test("si Resend rechaza el envío, avisa con su mensaje", async () => {
  const simulado = mock.method(globalThis, "fetch", () =>
    Promise.resolve(new Response(JSON.stringify({ message: "Domain not verified" }), { status: 403 })),
  );
  try {
    await assert.rejects(enviarEmail(mail, configuracion), /Domain not verified \[403\]/);
  } finally {
    simulado.mock.restore();
  }
});

test("escapa el texto que va dentro del HTML", () => {
  assert.equal(escaparHtml(`<b>"Agus" & 'cía'</b>`), "&lt;b&gt;&quot;Agus&quot; &amp; &#39;cía&#39;&lt;/b&gt;");
});
