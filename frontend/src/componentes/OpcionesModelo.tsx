import { rutinasApi, type ModeloRutina } from "../api/rutinas";
import { useCarga } from "../hooks/useCarga";
import { ETIQUETAS_TIPO_BLOQUE } from "../utils/rutinas";

// Botones para elegir el modelo de una rutina nueva. Cada gimnasio ve solo los modelos que tiene cargados.
export default function OpcionesModelo({ onElegir }: { onElegir: (tipo: ModeloRutina) => void }) {
  const { datos: modelos, error } = useCarga(() => rutinasApi.modelos(), []);

  if (error) return <p className="mensaje-error">{error}</p>;
  if (!modelos) return <p className="texto-suave">Cargando modelos…</p>;
  if (modelos.length === 0) return <p className="texto-suave">Este gimnasio todavía no tiene modelos de rutina cargados.</p>;

  return (
    <div className="opciones-bloque">
      {modelos.map((tipo) => (
        <button key={tipo} type="button" className="opcion-bloque" onClick={() => onElegir(tipo)}>
          {ETIQUETAS_TIPO_BLOQUE[tipo]}
        </button>
      ))}
    </div>
  );
}
