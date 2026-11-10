import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// Ventana de confirmación con el estilo de la app, en lugar del window.confirm del navegador.
// Uso:  const confirmar = useConfirmar();
//       if (!(await confirmar({ titulo: "¿Eliminar la rutina?", mensaje: "No se puede deshacer.", textoConfirmar: "Eliminar", peligro: true }))) return;
// Usa <dialog> nativo: tapa el resto de la pantalla, Esc cancela y el foco queda dentro de la ventana.
interface OpcionesConfirmar {
  titulo: string;
  mensaje?: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligro?: boolean; // botón rojo, para lo que no se puede deshacer
}

type Pedido = OpcionesConfirmar & { responder: (si: boolean) => void };

const ContextoConfirmar = createContext<((opciones: OpcionesConfirmar) => Promise<boolean>) | null>(null);

export function useConfirmar() {
  const confirmar = useContext(ContextoConfirmar);
  if (!confirmar) throw new Error("useConfirmar va dentro de ProveedorConfirmar");
  return confirmar;
}

export function ProveedorConfirmar({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  const confirmar = useCallback(
    (opciones: OpcionesConfirmar) =>
      new Promise<boolean>((resolver) => {
        setPedido({ ...opciones, responder: resolver });
      }),
    [],
  );

  useEffect(() => {
    if (pedido && !dialogo.current?.open) dialogo.current?.showModal();
  }, [pedido]);

  function responder(si: boolean) {
    if (!pedido) return;
    dialogo.current?.close();
    pedido.responder(si);
    setPedido(null);
  }

  return (
    <ContextoConfirmar.Provider value={confirmar}>
      {children}
      {pedido && (
        <dialog
          ref={dialogo}
          className="dialogo-confirmar"
          aria-labelledby="dialogo-confirmar-titulo"
          // Esc o tocar fuera de la ventana = cancelar.
          onCancel={(evento) => {
            evento.preventDefault();
            responder(false);
          }}
          onClick={(evento) => {
            if (evento.target === dialogo.current) responder(false);
          }}
        >
          <h2 id="dialogo-confirmar-titulo">{pedido.titulo}</h2>
          {pedido.mensaje && <p>{pedido.mensaje}</p>}
          <div className="acciones acciones-formulario">
            <button type="button" className="boton-secundario" onClick={() => responder(false)} autoFocus>
              {pedido.textoCancelar ?? "Cancelar"}
            </button>
            <button type="button" className={pedido.peligro ? "boton-eliminar" : "boton"} onClick={() => responder(true)}>
              {pedido.textoConfirmar ?? "Aceptar"}
            </button>
          </div>
        </dialog>
      )}
    </ContextoConfirmar.Provider>
  );
}
