import { Link } from "react-router";
import { rutinasApi, type Rutina } from "../api/rutinas";
import { formatearFecha } from "../utils/formato";
import { ETIQUETAS_TIPO_BLOQUE, linkRutinaWhatsApp, MODELOS_RUTINA } from "../utils/rutinas";

interface Props {
  rutinas: Rutina[];
  alumno: { nombre: string; telefono: string };
  onEliminar?: (rutina: Rutina) => void; // si no se pasa, no se muestra "Eliminar"
}

// WhatsApp no deja adjuntar archivos desde un link: se descarga el PDF y se arrastra al chat que se abre.
function descargar(url: string) {
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.click();
}

// Tabla de rutinas de un alumno (la usan la pantalla de Rutinas y la ficha del alumno).
export default function ListaRutinas({ rutinas, alumno, onEliminar }: Props) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla">
        <thead>
          <tr>
            <th>Modelo</th>
            <th>Deporte / objetivo</th>
            <th>Desde</th>
            <th>Hasta</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rutinas.map((rutina) => (
            <tr key={rutina.id}>
              <td className="sin-salto">{ETIQUETAS_TIPO_BLOQUE[rutina.tipo]}</td>
              <td>{rutina.objetivo ?? <span className="texto-suave">—</span>}</td>
              <td className="sin-salto">{formatearFecha(rutina.desde)}</td>
              <td className="sin-salto">{formatearFecha(rutina.hasta)}</td>
              <td className="sin-salto">
                <Link to={`/rutinas/editar/${rutina.id}`} className="boton-link">
                  Abrir
                </Link>
                <a href={rutinasApi.urlDescarga(rutina.id)} className="boton-link">
                  Descargar
                </a>
                <a
                  href={linkRutinaWhatsApp(alumno)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boton-link"
                  title="Descarga el PDF y abre el chat. Arrastrá el archivo al chat para enviarlo."
                  onClick={() => descargar(rutinasApi.urlDescarga(rutina.id))}
                >
                  Enviar
                </a>
                {/* Las rutinas viejas usan una planilla que ya no se elige */}
                {MODELOS_RUTINA.some((modelo) => modelo === rutina.tipo) && (
                  <Link to={`/rutinas/${rutina.alumnoId}/nueva?tipo=${rutina.tipo}&base=${rutina.id}`} className="boton-link">
                    Usar como base
                  </Link>
                )}
                {onEliminar && (
                  <button type="button" className="boton-link peligro" onClick={() => onEliminar(rutina)}>
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
