// Funciones de presentación: fechas en dd-mm-aaaa.
// Las fechas de calendario llegan como ISO ("2001-05-10T00:00:00.000Z"): se usan solo los
// primeros 10 caracteres, sin convertir a hora local (si no, podría mostrarse el día anterior).

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");

export function formatearFecha(iso: string | null | undefined) {
  if (!iso) return "";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}-${mes}-${anio}`;
}

// Para momentos con hora (ej.: cuándo se hizo un cambio): sí se muestran en hora local.
// Resultado: "dd-mm-aaaa hh:mm".
export function formatearFechaHora(iso: string) {
  const fecha = new Date(iso);
  const dia = `${dosDigitos(fecha.getDate())}-${dosDigitos(fecha.getMonth() + 1)}-${fecha.getFullYear()}`;
  return `${dia} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

// Minúsculas y sin tildes, para buscar: "Pérez" → "perez".
function normalizarTexto(texto: string) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// ¿El texto contiene todas las palabras buscadas? (sin distinguir tildes ni mayúsculas)
export function coincideBusqueda(texto: string, busqueda: string) {
  const normalizado = normalizarTexto(texto);
  return normalizarTexto(busqueda)
    .split(/\s+/)
    .filter(Boolean)
    .every((palabra) => normalizado.includes(palabra));
}

// Montos en pesos: "$ 25.000,00".
export function formatearMoneda(valor: string | number) {
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

// "2026-11" → "noviembre de 2026".
export function nombreDelMes(mes: string) {
  const [anio, numero] = mes.split("-").map(Number);
  return new Date(anio, numero - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

// Suma meses a "aaaa-mm-dd" respetando el fin de mes (31-01 + 1 mes = 28-02). Igual que en el backend.
export function sumarMeses(texto: string, meses: number) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  const ultimoDiaDelMes = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0)).getUTCDate();
  fecha.setUTCDate(Math.min(dia, ultimoDiaDelMes));
  return fecha.toISOString().slice(0, 10);
}

export function calcularEdad(fechaNacimiento: string) {
  const [anio, mes, dia] = fechaNacimiento.slice(0, 10).split("-").map(Number);
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const yaCumplio = mesActual > mes || (mesActual === mes && hoy.getDate() >= dia);
  return hoy.getFullYear() - anio - (yaCumplio ? 0 : 1);
}

// Fecha local como "aaaa-mm-dd" (el formato de los <input type="date">).
export function fechaComoTexto(fecha: Date) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

export function hoyComoTexto() {
  return fechaComoTexto(new Date());
}
