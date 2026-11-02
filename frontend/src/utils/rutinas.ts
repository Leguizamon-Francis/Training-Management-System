import type { ModeloRutina, TipoBloque } from "../api/rutinas";
import { linkChatWhatsApp } from "./whatsapp";

export function linkRutinaWhatsApp({ nombre, telefono }: { nombre: string; telefono: string }) {
  return linkChatWhatsApp(telefono, `Hola ${nombre}, ¿cómo estás? Te paso tu rutina.`);
}

// Modelos que se pueden elegir para una rutina nueva.
export const MODELOS_RUTINA: ModeloRutina[] = ["MODELO_RUTINA", "MODELO_RUTINA_2"];

export const ETIQUETAS_TIPO_BLOQUE: Record<TipoBloque, string> = {
  MODELO_RUTINA: "Modelo Rutina",
  MODELO_RUTINA_2: "Modelo Rutina 2",
  MICROCICLOS_2_SEMANAS: "Bloque de 4 microciclos de 2 semanas",
  MICROCICLOS_1_SEMANA: "Bloque de 4 microciclos de 1 semana",
};
