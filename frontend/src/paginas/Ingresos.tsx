import { useEffect, useState } from "react";
import { Link } from "react-router";
import { pagosApi, type ReporteIngresos } from "../api/pagos";
import { fechaComoTexto, formatearFecha, formatearMoneda, hoyComoTexto, nombreDelMes } from "../utils/formato";
import { ETIQUETAS_MEDIO } from "../utils/pagos";

function rangoMesActual() {
  const hoy = hoyComoTexto();
  return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
}

function rangoMesAnterior() {
  const hoy = new Date();
  return {
    desde: fechaComoTexto(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
    hasta: fechaComoTexto(new Date(hoy.getFullYear(), hoy.getMonth(), 0)),
  };
}

function rangoAnioActual() {
  const hoy = hoyComoTexto();
  return { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy };
}

export default function Ingresos() {
  const [rango, setRango] = useState(rangoMesActual);
  const [reporte, setReporte] = useState<ReporteIngresos | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rango.desde || !rango.hasta) return;
    pagosApi
      .ingresos(rango.desde, rango.hasta)
      .then((datos) => {
        setReporte(datos);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [rango]);

  return (
    <section>
      <Link to="/pagos" className="volver">
        ← Pagos
      </Link>
      <h1>Ingresos</h1>

      <div className="filtros-rango">
        <label className="campo">
          Desde
          <input type="date" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} />
        </label>
        <label className="campo">
          Hasta
          <input type="date" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} />
        </label>
        <div className="acciones">
          <button type="button" className="boton-secundario" onClick={() => setRango(rangoMesActual())}>
            Este mes
          </button>
          <button type="button" className="boton-secundario" onClick={() => setRango(rangoMesAnterior())}>
            Mes anterior
          </button>
          <button type="button" className="boton-secundario" onClick={() => setRango(rangoAnioActual())}>
            Este año
          </button>
        </div>
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      {reporte && (
        <>
          <div className="totales">
            <div className="tarjeta total total-principal">
              <span className="texto-suave">Total ({reporte.cantidad} {reporte.cantidad === 1 ? "pago" : "pagos"})</span>
              <strong>{formatearMoneda(reporte.totales.total)}</strong>
            </div>
            <div className="tarjeta total">
              <span className="texto-suave">Efectivo</span>
              <strong>{formatearMoneda(reporte.totales.efectivo)}</strong>
            </div>
            <div className="tarjeta total">
              <span className="texto-suave">Transferencia</span>
              <strong>{formatearMoneda(reporte.totales.transferencia)}</strong>
            </div>
            <div className="tarjeta total">
              <span className="texto-suave">Otros conceptos</span>
              <strong>{formatearMoneda(reporte.totales.otros)}</strong>
            </div>
          </div>

          {reporte.porMes.length > 1 && (
            <div className="tarjeta seccion">
              <h2>Por mes</h2>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th className="numero">Efectivo</th>
                      <th className="numero">Transferencia</th>
                      <th className="numero">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.porMes.map((fila) => (
                      <tr key={fila.mes}>
                        <td className="primera-mayuscula">{nombreDelMes(fila.mes)}</td>
                        <td className="numero">{formatearMoneda(fila.efectivo)}</td>
                        <td className="numero">{formatearMoneda(fila.transferencia)}</td>
                        <td className="numero">
                          <strong>{formatearMoneda(fila.total)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="tarjeta seccion">
            <h2>Detalle de pagos</h2>
            {reporte.pagos.length === 0 ? (
              <p className="texto-suave">No hay pagos en este período.</p>
            ) : (
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Alumno</th>
                      <th>Concepto</th>
                      <th>Medio</th>
                      <th className="numero">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.pagos.map((pago) => (
                      <tr key={pago.id}>
                        <td className="sin-salto">{formatearFecha(pago.fecha)}</td>
                        <td>
                          <Link to={`/alumnos/${pago.alumno.id}`}>
                            {pago.alumno.apellido}, {pago.alumno.nombre}
                          </Link>
                        </td>
                        <td>{pago.concepto}</td>
                        <td>{ETIQUETAS_MEDIO[pago.medio]}</td>
                        <td className="numero sin-salto">{formatearMoneda(pago.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
