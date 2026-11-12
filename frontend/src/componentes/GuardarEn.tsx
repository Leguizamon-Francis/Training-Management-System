import { useEffect, useRef, useState } from "react";
import { rutinasApi } from "../api/rutinas";
import { useCarga } from "../hooks/useCarga";
import { coincideBusqueda } from "../utils/formato";

interface Props {
  alumnoActualId: number | null; // no se ofrece: para ese alumno ya está "Guardar rutina"
  ocupado: boolean;
  onAlumno: (alumno: { id: number; nombre: string; apellido: string }) => void;
  onDescargar: () => void;
  onCerrar: () => void;
}

// Ventana de "Guardar en" del editor de rutinas: guardar la rutina en otro alumno o descargarla sin guardarla.
export default function GuardarEn({ alumnoActualId, ocupado, onAlumno, onDescargar, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const { datos: alumnos, error } = useCarga(() => rutinasApi.alumnos(), []); // alumnos activos
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  const visibles = (alumnos ?? []).filter(
    (a) => a.id !== alumnoActualId && coincideBusqueda(`${a.nombre} ${a.apellido}`, buscar),
  );

  function cerrar() {
    if (!ocupado) onCerrar();
  }

  return (
    <dialog
      ref={dialogo}
      className="dialogo-confirmar dialogo-guardar-en"
      aria-labelledby="guardar-en-titulo"
      onCancel={(evento) => {
        evento.preventDefault();
        cerrar();
      }}
      onClick={(evento) => {
        if (evento.target === dialogo.current) cerrar();
      }}
    >
      <h2 id="guardar-en-titulo">Guardar en</h2>
      <p>Elegí el alumno: la rutina se guarda en sus rutinas, con su nombre y su edad en la planilla.</p>

      <input
        type="search"
        placeholder="Buscar alumno"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        aria-label="Buscar alumno"
      />

      {error && <p className="mensaje-error">{error}</p>}
      {alumnos && (
        <ul className="lista-guardar-en">
          {visibles.length === 0 ? (
            <li className="texto-suave">No hay alumnos que coincidan.</li>
          ) : (
            visibles.map((alumno) => (
              <li key={alumno.id}>
                <button type="button" className="boton-link" disabled={ocupado} onClick={() => onAlumno(alumno)}>
                  {alumno.apellido}, {alumno.nombre}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      <div className="acciones acciones-formulario">
        <button type="button" className="boton-secundario" onClick={cerrar} disabled={ocupado}>
          Cancelar
        </button>
        {/* Baja el PDF tal como está en pantalla, sin guardarlo en el sistema. */}
        <button type="button" data-no-en-demo className="boton-secundario" onClick={onDescargar} disabled={ocupado}>
          Descargar PDF
        </button>
      </div>
    </dialog>
  );
}
