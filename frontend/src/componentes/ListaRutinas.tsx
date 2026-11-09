import { Link, useLocation } from "react-router";
import { rutinasApi, type Rutina, type RutinaSuelta } from "../api/rutinas";
import { formatearFecha } from "../utils/formato";
import { ETIQUETAS_TIPO_BLOQUE, linkRutinaWhatsApp, MODELOS_RUTINA } from "../utils/rutinas";
import { useEsDemo } from "./Sesion";

type Props =
  | { rutinas: Rutina[]; alumno: { nombre: string; telefono: string }; onEliminar?: (rutina: Rutina) => void }
  | { rutinas: RutinaSuelta[]; alumno: null; onEliminar?: (rutina: Rutina) => void }; // rutinas sin alumno

// WhatsApp no deja adjuntar archivos desde un link: se descarga el PDF y se arrastra al chat que se abre.
function descargar(url: string) {
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.click();
}

// Tabla de rutinas de un alumno (pantalla de Rutinas y ficha del alumno) o de las rutinas sin alumno.
// Si no se pasa onEliminar, no se muestra "Eliminar".
export default function ListaRutinas({ rutinas, alumno, onEliminar }: Props) {
  const esDemo = useEsDemo();
  const origen = useLocation().state; // el editor lo devuelve al volver (ej.: hasta Inicio)

  return (
    <div className="tabla-contenedor">
      <table className="tabla">
        <thead>
          <tr>
            {!alumno && <th>Nombre</th>}
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
              {!alumno && <td>{(rutina as RutinaSuelta).nombre ?? <span className="texto-suave">Sin nombre</span>}</td>}
              <td className="sin-salto">{ETIQUETAS_TIPO_BLOQUE[rutina.tipo]}</td>
              <td>{rutina.objetivo ?? <span className="texto-suave">—</span>}</td>
              <td className="sin-salto">{formatearFecha(rutina.desde)}</td>
              <td className="sin-salto">{formatearFecha(rutina.hasta)}</td>
              <td className="sin-salto">
                <Link to={`/rutinas/editar/${rutina.id}`} state={origen} className="boton-link">
                  Abrir
                </Link>
                {/* La demo ve las planillas, pero no las descarga ni las manda (el servidor tampoco lo permite). */}
                {!esDemo && (
                  <a href={rutinasApi.urlDescarga(rutina.id)} className="boton-link">
                    Descargar
                  </a>
                )}
                {alumno && !esDemo && (
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
                )}
                {/* Solo en las rutinas de un alumno; las viejas usan una planilla que ya no se elige */}
                {alumno && MODELOS_RUTINA.some((modelo) => modelo === rutina.tipo) && (
                  <Link to={`/rutinas/${rutina.alumnoId}/nueva?tipo=${rutina.tipo}&base=${rutina.id}`} state={origen} className="boton-link">
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
