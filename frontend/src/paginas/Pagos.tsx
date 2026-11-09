import { useState } from "react";
import { Link } from "react-router";
import { pagosApi, type EstadoCuotaAlumno } from "../api/pagos";
import BotonVerTodos from "../componentes/BotonVerTodos";
import { IconoMensaje } from "../componentes/Iconos";
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
import { useEsDemo } from "../componentes/Sesion";

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
  const esDemo = useEsDemo();
  const { datos: filas, error } = useCarga(() => pagosApi.estadoCuotas(), []);
  const [filtro, setFiltro] = useState<Filtro>("TODOS");

  const criterio = FILTROS.find((f) => f.valor === filtro)!;
  const visibles = filas?.filter(criterio.cumple) ?? [];
  const lista = useListaCorta(visibles, 3);

  return (
    <section>
      <h1>Membresías</h1>

      {error && <p className="mensaje-error">{error}</p>}

      {/* En un recuadro, igual que "Últimos ingresos", para que las dos listas se vean iguales. */}
      {filas && (
        <div className="tarjeta seccion">
          <h2>Estado de las cuotas</h2>
          {/* En el celular los filtros van en un desplegable; en la computadora, como botones. */}
          <select
            className="filtro-desplegable"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as Filtro)}
            aria-label="Filtrar por estado de la cuota"
          >
            {FILTROS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.etiqueta} ({filas.filter(f.cumple).length})
              </option>
            ))}
          </select>
          <div className="filtros-chips filtros-chips-cuotas">
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
              <table className="tabla tabla-cuotas">
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
                  {lista.visibles.map((fila) => {
                    const debe = fila.cantidadAdeudadas > 0;
                    return (
                    <tr key={fila.id}>
                      <td>
                        <Link to={`/membresias/alumnos/${fila.id}`} className="enlace-fila">
                          {fila.apellido}, {fila.nombre}
                        </Link>
                      </td>
                      <td className="celda-membresia">{fila.plan ?? <span className="texto-suave">Sin membresía</span>}</td>
                      <td className="celda-estado">
                        <span className={claseEstadoCuota(fila.estado)}>{ETIQUETAS_ESTADO_CUOTA[fila.estado]}</span>
                      </td>
                      {/* En el celular se ve una sola de estas dos: la deuda si hay, y si no el vencimiento. */}
                      <td className={debe ? "oculta-celular" : undefined}>
                        {textoVencimiento(fila.estado, fila.vence, fila.diasRestantes) || <span className="texto-suave">—</span>}
                      </td>
                      <td className={`numero sin-salto${debe ? "" : " oculta-celular"}`}>
                        {Number(fila.deudaTotal) > 0 && formatearMoneda(fila.deudaTotal)}
                        {fila.cantidadAdeudadas > 0 && (
                          <span className="texto-suave">
                            {" "}
                            ({fila.cantidadAdeudadas} {fila.cantidadAdeudadas === 1 ? "cuota" : "cuotas"})
                          </span>
                        )}
                        {Number(fila.deudaTotal) === 0 && fila.cantidadAdeudadas === 0 && <span className="texto-suave">—</span>}
                      </td>
                      <td className="celda-acciones">
                        {requiereAviso(fila.estado) && !esDemo && (
                          <a
                            className="boton-whatsapp"
                            href={linkWhatsApp(fila)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Avisar a ${fila.nombre} por WhatsApp`}
                          >
                            <IconoMensaje />
                            <span className="solo-ancho">WhatsApp</span>
                          </a>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <BotonVerTodos lista={lista} textoCerrar="Ver menos" />
            </div>
          )}
        </div>
      )}

      <div className="pie-lista">
        {/* En el celular solo queda a la vista "Registrar pago"; los otros dos, en el menú "⋯". */}
        <div className="acciones-pagos">
          <Link to="/membresias/ingresos" className="boton-secundario solo-ancho">
            Historial de ingresos
          </Link>
          <Link to="/membresias/nuevo" className="boton">
            Registrar pago
          </Link>
          <Link to="/membresias/configuracion" className="boton-secundario solo-ancho">
            Configurar membresías
          </Link>
          <details className="menu-mas">
            <summary className="boton-secundario" aria-label="Más opciones">
              ⋯
            </summary>
            <div className="menu-mas-opciones tarjeta">
              <Link to="/membresias/ingresos">Historial de ingresos</Link>
              <Link to="/membresias/configuracion">Configurar membresías</Link>
            </div>
          </details>
        </div>
      </div>

      <UltimosIngresos />
    </section>
  );
}
