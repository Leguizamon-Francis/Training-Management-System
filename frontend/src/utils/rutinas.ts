import type { ModeloRutina, TipoBloque } from "../api/rutinas";
import { linkChatWhatsApp } from "./whatsapp";

export function linkRutinaWhatsApp({ nombre, telefono }: { nombre: string; telefono: string }) {
  return linkChatWhatsApp(telefono, `Hola ${nombre}, ¿cómo estás? Te paso tu rutina.`);
}

// Todos los modelos actuales (cada gimnasio elige entre los que tiene cargados: GET /api/rutinas/modelos).
export const MODELOS_RUTINA: ModeloRutina[] = ["MODELO_RUTINA", "MODELO_RUTINA_2", "PLANILLA_6_SEMANAS"];

export const ETIQUETAS_TIPO_BLOQUE: Record<TipoBloque, string> = {
  MODELO_RUTINA: "Modelo Rutina",
  MODELO_RUTINA_2: "Modelo Rutina 2",
  PLANILLA_6_SEMANAS: "Planilla 6 semanas",
  MICROCICLOS_2_SEMANAS: "Bloque de 4 microciclos de 2 semanas",
  MICROCICLOS_1_SEMANA: "Bloque de 4 microciclos de 1 semana",
};
