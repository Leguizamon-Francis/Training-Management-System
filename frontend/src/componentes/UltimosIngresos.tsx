import { Link } from "react-router";
import { pagosApi } from "../api/pagos";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { formatearFecha, formatearMoneda } from "../utils/formato";
import { ETIQUETAS_MEDIO } from "../utils/pagos";
import BotonVerTodos from "./BotonVerTodos";

// Lista "Últimos ingresos" de la pantalla Membresías: los 20 pagos más recientes de todos los alumnos
// (el resto, en Historial de Ingresos).
export default function UltimosIngresos() {
  const { datos: pagos, error } = useCarga(() => pagosApi.ultimos(20), []);
  const lista = useListaCorta(pagos ?? [], 3);

  return (
    <div className="tarjeta seccion ultimos-ingresos">
      <h2>Últimos ingresos</h2>
      {error && <p className="mensaje-error">{error}</p>}
      {pagos &&
        (pagos.length === 0 ? (
          <p className="texto-suave">Todavía no hay pagos registrados.</p>
        ) : (
          <>
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
                  {lista.visibles.map((pago) => (
                    <tr key={pago.id}>
                      <td className="sin-salto">{formatearFecha(pago.fecha)}</td>
                      <td>
                        <Link to={`/membresias/alumnos/${pago.alumno.id}`}>
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
            <BotonVerTodos lista={lista} />
            {lista.abierta && (
              <p className="nota">
                <Link to="/membresias/ingresos" className="link-discreto">
                  Ver el historial completo en Historial de Ingresos →
                </Link>
              </p>
            )}
          </>
        ))}
    </div>
  );
}
