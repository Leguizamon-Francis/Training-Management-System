import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { alumnosApi } from "../api/alumnos";
import { pagosApi, type Pago } from "../api/pagos";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { formatearFecha, formatearMoneda } from "../utils/formato";
import {
  claseEstadoCuota,
  ETIQUETAS_ESTADO_CUOTA,
  ETIQUETAS_MEDIO,
  linkWhatsApp,
  requiereAviso,
} from "../utils/pagos";
import BotonVerTodos from "./BotonVerTodos";
import Cargando from "./Cargando";
import Desplegable from "./Desplegable";
import FormularioCorregirPago from "./FormularioCorregirPago";
import FormularioPago from "./FormularioPago";
import { IconoMensaje } from "./Iconos";
import SelectorPlan from "./SelectorPlan";

interface Props {
  alumno: { id: number; nombre: string; apellido: string; telefono: string; activo: boolean };
  onCambio: () => void; // para que la pantalla actualice el historial y el estado del alumno
  enFicha?: boolean; // true: sección desplegable de la ficha; false: abierta, en la pantalla de Membresías
}

function Contenedor({ enFicha, children }: { enFicha: boolean; children: ReactNode }) {
  return enFicha ? <Desplegable titulo="Membresía">{children}</Desplegable> : <div className="tarjeta seccion">{children}</div>;
}

// Membresía, estado de la cuota, deuda y pagos de un alumno.
export default function PagosAlumno({ alumno, onCambio, enFicha = true }: Props) {
  const { datos, error, setError, recargar } = useCarga(() => pagosApi.obtener(alumno.id), [alumno.id]);
  const [registrando, setRegistrando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<Pago | null>(null);
  const lista = useListaCorta(datos?.pagos ?? [], 3);

  async function planCambiado() {
    await recargar();
    onCambio();
  }

  // El alumno avisó que no sigue: las cuotas adeudadas no se le cobran.
  // Después se ofrece darlo de baja (si sigue activo, se le vuelven a acumular cuotas).
  async function anularDeuda() {
    if (!datos) return;
    const { cuotasAdeudadas, deudaTotal } = datos.situacion;
    const cantidad = `${cuotasAdeudadas.length} ${cuotasAdeudadas.length === 1 ? "cuota" : "cuotas"}`;
    const monto = Number(deudaTotal) > 0 ? ` (${formatearMoneda(deudaTotal)})` : "";
    if (!window.confirm(`¿Anular la deuda de ${cantidad}${monto}? No se le van a cobrar.`)) return;
    try {
      await pagosApi.anularDeuda(alumno.id);
      if (
        alumno.activo &&
        window.confirm(`¿Dar de baja a ${alumno.nombre} ${alumno.apellido}? Si sigue activo, se le van a volver a acumular cuotas.`)
      ) {
        await alumnosApi.cambiarEstado(alumno.id, false);
      }
      await recargar();
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo anular la deuda");
    }
  }

  async function eliminarPago(pago: Pago) {
    const pregunta = `¿Eliminar el pago de ${formatearMoneda(pago.importe)} del ${formatearFecha(pago.fecha)}? No se puede deshacer.`;
    if (!window.confirm(pregunta)) return;
    try {
      await pagosApi.eliminar(pago.id);
      setCorrigiendo(null);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el pago");
    }
  }

  async function pagoCorregido() {
    setCorrigiendo(null);
    await recargar();
    onCambio(); // la corrección queda en el historial de cambios
  }

  async function pagoRegistrado() {
    setRegistrando(false);
    await recargar();
  }

  if (!datos) {
    return (
      <Contenedor enFicha={enFicha}>
        <Cargando error={error} />
      </Contenedor>
    );
  }

  const { plan, situacion, pagos } = datos;
  const adeudadas = situacion.cuotasAdeudadas;
  // Solo se puede eliminar el pago de la última cuota (las cuotas se encadenan) o uno por otro concepto.
  const sePuedeEliminar = (pago: Pago) => !pago.cuotaId || pago.cuotaId === situacion.ultimaCuota?.id;

  return (
    <Contenedor enFicha={enFicha}>
      {error && <p className="mensaje-error">{error}</p>}

      <div className="fila-plan">
        <SelectorPlan alumnoId={alumno.id} planActual={plan} onCambio={planCambiado} conEtiqueta={!enFicha}>
          <span className={claseEstadoCuota(situacion.estado)}>{ETIQUETAS_ESTADO_CUOTA[situacion.estado]}</span>
        </SelectorPlan>
        {enFicha && (
          <Link to="/membresias" className="link-discreto">
            Ir a Membresías →
          </Link>
        )}
      </div>

      {requiereAviso(situacion.estado) && (
        <div className="pago-estado">
          <a
            className="boton-whatsapp"
            href={linkWhatsApp({ ...alumno, ...situacion, cantidadAdeudadas: adeudadas.length })}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconoMensaje />
            Comunicarse vía WhatsApp
          </a>
        </div>
      )}

      {adeudadas.length > 0 && (
        <div className="pago-saldo">
          <div>
            <p className="deuda-titulo">
              Debe {adeudadas.length} {adeudadas.length === 1 ? "cuota" : "cuotas"}
              {situacion.precioCuotaAdeudada ? (
                <>
                  : <strong>{formatearMoneda(situacion.deudaTotal)}</strong>
                </>
              ) : (
                <span className="texto-suave"> (la membresía no tiene precio definido)</span>
              )}
            </p>
            <ul className="lista-deuda">
              {adeudadas.map((periodo) => (
                <li key={periodo.desde}>
                  Del {formatearFecha(periodo.desde)} al {formatearFecha(periodo.vence)}
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="boton-link peligro" onClick={anularDeuda}>
            Anular deuda
          </button>
        </div>
      )}

      {registrando ? (
        <FormularioPago
          alumnoId={alumno.id}
          plan={plan}
          inicioCuota={situacion.inicioProximaCuota}
          cantidadAdeudadas={adeudadas.length}
          onGuardado={pagoRegistrado}
          onCancelar={() => setRegistrando(false)}
        />
      ) : (
        <button type="button" className="boton" onClick={() => setRegistrando(true)}>
          Registrar pago
        </button>
      )}

      <div className="separador" />

      {corrigiendo && (
        <FormularioCorregirPago key={corrigiendo.id} pago={corrigiendo} onGuardado={pagoCorregido} onCancelar={() => setCorrigiendo(null)} />
      )}

      {pagos.length === 0 ? (
        <p className="texto-suave">Todavía no hay pagos registrados.</p>
      ) : (
        <>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Medio</th>
                  <th className="numero">Importe</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.visibles.map((pago) => (
                  <tr key={pago.id}>
                    <td className="sin-salto">{formatearFecha(pago.fecha)}</td>
                    <td>
                      {pago.concepto}
                      {pago.cuota && (
                        <span className="texto-suave">
                          {" "}
                          ({formatearFecha(pago.cuota.desde)} al {formatearFecha(pago.cuota.vence)})
                        </span>
                      )}
                    </td>
                    <td>{ETIQUETAS_MEDIO[pago.medio]}</td>
                    <td className="numero sin-salto">{formatearMoneda(pago.importe)}</td>
                    <td className="sin-salto">
                      <button type="button" className="boton-link" onClick={() => setCorrigiendo(pago)}>
                        Editar
                      </button>
                      {sePuedeEliminar(pago) && (
                        <button type="button" className="boton-link peligro" onClick={() => eliminarPago(pago)}>
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BotonVerTodos lista={lista} />
        </>
      )}
    </Contenedor>
  );
}
