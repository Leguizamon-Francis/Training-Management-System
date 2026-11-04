import { useState } from "react";
import { Link } from "react-router";
import { pagosApi, type EstadoCuotaAlumno } from "../api/pagos";
import BotonVerTodos from "../componentes/BotonVerTodos";
import UltimosIngresos from "../componentes/UltimosIngresos";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { formatearMoneda } from "../utils/formato";
import {
  claseEstadoCuota,
  ETIQUETAS_ESTADO_CUOTA,
  linkWhatsApp,
  requiereAviso,
  textoVencimiento,
} from "../utils/pagos";

type Filtro = "TODOS" | "VENCIDA" | "POR_VENCER" | "SIN_PAGOS" | "AL_DIA";

const FILTROS: { valor: Filtro; etiqueta: string; cumple: (fila: EstadoCuotaAlumno) => boolean }[] = [
  { valor: "TODOS", etiqueta: "Todos", cumple: () => true },
  { valor: "VENCIDA", etiqueta: "Vencidas", cumple: (f) => f.estado === "VENCIDA" },
  { valor: "POR_VENCER", etiqueta: "Por vencer", cumple: (f) => f.estado === "POR_VENCER" },
  { valor: "SIN_PAGOS", etiqueta: "Sin pagos", cumple: (f) => f.estado === "SIN_PAGOS" },
  { valor: "AL_DIA", etiqueta: "Al día", cumple: (f) => f.estado === "AL_DIA" },
];

// Estado de las cuotas de todos los alumnos activos. El backend ya los ordena: lo urgente primero.
export default function Pagos() {
  const { datos: filas, error } = useCarga(() => pagosApi.estadoCuotas(), []);
  const [filtro, setFiltro] = useState<Filtro>("TODOS");

  const criterio = FILTROS.find((f) => f.valor === filtro)!;
  const visibles = filas?.filter(criterio.cumple) ?? [];
  const lista = useListaCorta(visibles, 3);

  return (
    <section>
      <div className="pagina-encabezado">
        <h1>Membresías</h1>
        <div className="acciones-pagos">
          <Link to="/membresias/ingresos" className="boton-secundario">
            Historial de Ingresos
          </Link>
          <Link to="/membresias/nuevo" className="boton">
            Registrar un Pago
          </Link>
          <Link to="/membresias/configuracion" className="boton-secundario">
            Configurar Membresías
          </Link>
        </div>
      </div>
      <p className="texto-suave">Estado de la cuota de los alumnos activos.</p>

      {error && <p className="mensaje-error">{error}</p>}

      {filas && (
        <>
          <div className="filtros-chips">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                type="button"
                className={f.valor === filtro ? "chip chip-activo" : "chip"}
                onClick={() => setFiltro(f.valor)}
              >
                {f.etiqueta} ({filas.filter(f.cumple).length})
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <p className="texto-suave">No hay alumnos en esta categoría.</p>
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Membresía</th>
                    <th>Estado</th>
                    <th>Vencimiento</th>
                    <th className="numero">Deuda</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lista.visibles.map((fila) => (
                    <tr key={fila.id}>
                      <td>
                        <Link to={`/membresias/alumnos/${fila.id}`}>
                          {fila.apellido}, {fila.nombre}
                        </Link>
                      </td>
                      <td>{fila.plan ?? <span className="texto-suave">Sin membresía</span>}</td>
                      <td>
                        <span className={claseEstadoCuota(fila.estado)}>{ETIQUETAS_ESTADO_CUOTA[fila.estado]}</span>
                      </td>
                      <td>{textoVencimiento(fila.estado, fila.vence, fila.diasRestantes) || <span className="texto-suave">—</span>}</td>
                      <td className="numero sin-salto">
                        {Number(fila.deudaTotal) > 0 && formatearMoneda(fila.deudaTotal)}
                        {fila.cantidadAdeudadas > 0 && (
                          <span className="texto-suave">
                            {" "}
                            ({fila.cantidadAdeudadas} {fila.cantidadAdeudadas === 1 ? "cuota" : "cuotas"})
                          </span>
                        )}
                        {Number(fila.deudaTotal) === 0 && fila.cantidadAdeudadas === 0 && <span className="texto-suave">—</span>}
                      </td>
                      <td className="sin-salto">
                        {requiereAviso(fila.estado) && (
                          <a className="boton-whatsapp" href={linkWhatsApp(fila)} target="_blank" rel="noopener noreferrer">
                            WhatsApp
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <BotonVerTodos lista={lista} textoCerrar="Ver menos" />
            </div>
          )}
        </>
      )}

      <UltimosIngresos />
    </section>
  );
}
