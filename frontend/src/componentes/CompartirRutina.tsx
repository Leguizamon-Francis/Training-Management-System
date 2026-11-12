import { useEffect, useRef, useState } from "react";
import { rutinasApi } from "../api/rutinas";
import { useSesion } from "./Sesion";
import { mensajeRutinaAlumno, urlRutinaAlumno } from "../utils/rutinas";
import { linkChatWhatsApp } from "../utils/whatsapp";

interface Props {
  rutinaId: number;
  linkAlumno: string | null;
  alumno: { nombre: string; telefono: string } | null; // null = rutina sin alumno: WhatsApp sin número
  onCambio: (linkAlumno: string | null) => void;
  onCerrar: () => void;
}

// Ventana para compartir una rutina con el alumno: crea el link, lo copia o lo manda por WhatsApp, y lo corta.
export default function CompartirRutina({ rutinaId, linkAlumno, alumno, onCambio, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const centroId = useSesion().usuario?.centro?.id;
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [confirmandoCorte, setConfirmandoCorte] = useState(false);

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  const url = linkAlumno && centroId ? urlRutinaAlumno(centroId, linkAlumno) : null;
  const mensaje = url ? mensajeRutinaAlumno(alumno?.nombre ?? null, url) : "";
  const whatsapp = alumno?.telefono
    ? linkChatWhatsApp(alumno.telefono, mensaje)
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`; // sin número: WhatsApp pide elegir el chat

  async function ejecutar(accion: () => Promise<void>) {
    setError("");
    setOcupado(true);
    try {
      await accion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setOcupado(false);
    }
  }

  const crear = () => ejecutar(async () => onCambio((await rutinasApi.compartir(rutinaId)).linkAlumno));

  const cortar = () =>
    ejecutar(async () => {
      await rutinasApi.dejarDeCompartir(rutinaId);
      setConfirmandoCorte(false);
      onCambio(null);
    });

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar: seleccioná el link y copialo a mano.");
    }
  }

  return (
    <dialog
      ref={dialogo}
      className="dialogo-confirmar"
      aria-labelledby="compartir-titulo"
      onCancel={(evento) => {
        evento.preventDefault();
        if (!ocupado) onCerrar();
      }}
      onClick={(evento) => {
        if (evento.target === dialogo.current && !ocupado) onCerrar();
      }}
    >
      <h2 id="compartir-titulo">Link para el alumno</h2>
      <p>
        Con el link, el alumno abre la rutina en el celular, elige el día y la semana, y puede anotar o cambiar lo que
        necesite. Lo que guarda lo ves al abrir la rutina acá.
      </p>

      {url && (
        <input type="text" readOnly value={url} className="campo-link" aria-label="Link de la rutina" onFocus={(e) => e.target.select()} />
      )}
      {error && <p className="mensaje-error">{error}</p>}

      {confirmandoCorte ? (
        <>
          <p>¿Dejar de compartir? El link deja de funcionar. Si después la volvés a compartir, sale un link nuevo.</p>
          <div className="acciones acciones-formulario">
            <button type="button" className="boton-secundario" onClick={() => setConfirmandoCorte(false)} disabled={ocupado}>
              Volver
            </button>
            <button type="button" className="boton-eliminar" onClick={cortar} disabled={ocupado}>
              Dejar de compartir
            </button>
          </div>
        </>
      ) : url ? (
        <div className="acciones acciones-formulario acciones-compartir">
          <button type="button" className="boton-link peligro" onClick={() => setConfirmandoCorte(true)} disabled={ocupado}>
            Dejar de compartir
          </button>
          <button type="button" className="boton-secundario" onClick={onCerrar} disabled={ocupado}>
            Cerrar
          </button>
          <button type="button" className="boton-secundario" onClick={copiar}>
            {copiado ? "Copiado" : "Copiar link"}
          </button>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="boton">
            Enviar por WhatsApp
          </a>
        </div>
      ) : (
        <div className="acciones acciones-formulario">
          <button type="button" className="boton-secundario" onClick={onCerrar} disabled={ocupado}>
            Cancelar
          </button>
          <button type="button" className="boton" onClick={crear} disabled={ocupado}>
            {ocupado ? "Creando…" : "Crear link"}
          </button>
        </div>
      )}
    </dialog>
  );
}
