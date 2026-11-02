// Link wa.me: abre WhatsApp con el mensaje escrito, para revisarlo y enviarlo.
// 549 = código de Argentina (54) + 9 (celulares). telefono: 10 dígitos, código de área + número.
export function linkChatWhatsApp(telefono: string, mensaje: string) {
  return `https://wa.me/549${telefono}?text=${encodeURIComponent(mensaje)}`;
}
