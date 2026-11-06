import { formatearFecha } from "./formato";

// Nombres para mostrar de cada campo (formulario e historial de cambios).
export const ETIQUETAS_CAMPO: Record<string, string> = {
  nombre: "Nombre",
  apellido: "Apellido",
  dni: "DNI",
  fechaNacimiento: "Fecha de nacimiento",
  telefono: "Teléfono",
  email: "Email",
  profesion: "Profesión",
  perfil: "Perfil",
  detallePerfil: "Detalle del perfil",
  antecedentesDeportivos: "Antecedentes deportivos", // campo eliminado: se conserva para el historial
  lesiones: "Lesiones",
  molestias: "Molestias/contracturas",
  actividadLaboral: "Actividad laboral",
  otrosDatos: "Otros datos",
  plan: "Membresía",
  activo: "Estado",
  deuda: "Deuda",
  pago: "Pago corregido",
};

// Muestra un valor del historial de forma legible.
export function formatearValorCambio(campo: string, valor: string | null) {
  if (valor === null) return "(vacío)";
  if (campo === "fechaNacimiento") return formatearFecha(valor);
  if (campo === "activo") return valor === "true" ? "Activo" : "Inactivo";
  return valor;
}
