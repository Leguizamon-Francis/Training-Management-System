import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { alumnosApi, type AlumnoResumen } from "../api/alumnos";
import { pagosApi, type PagosAlumno } from "../api/pagos";
import Cargando from "../componentes/Cargando";
import FormularioPago from "../componentes/FormularioPago";
import { claseEstadoCuota, ETIQUETAS_ESTADO_CUOTA, textoPrecioPlan, textoVencimiento } from "../utils/pagos";

// Cuántos alumnos se muestran como resultado de la búsqueda.
const MAXIMO_RESULTADOS = 8;

// Registrar pago desde la pantalla Membresías: primero se elige el alumno y después se carga el pago.
export default function PagoNuevo() {
  const navigate = useNavigate();
  const [buscar, setBuscar] = useState("");
  const [resultados, setResultados] = useState<AlumnoResumen[]>([]);
  const [alumno, setAlumno] = useState<AlumnoResumen | null>(null);
  const [datos, setDatos] = useState<PagosAlumno | null>(null);
  const [error, setError] = useState("");

  // Búsqueda de alumnos activos (300 ms después de la última tecla).
  useEffect(() => {
    if (alumno) return;
    const espera = setTimeout(() => {
      alumnosApi
        .listar({ buscar, estado: "activos", perfil: "" })
        .then((lista) => setResultados(lista.slice(0, MAXIMO_RESULTADOS)))
        .catch((err: Error) => setError(err.message));
    }, 300);
    return () => clearTimeout(espera);
  }, [buscar, alumno]);

  // Al elegir el alumno se trae su plan y el estado de su cuota.
  useEffect(() => {
    if (!alumno) return;
    setDatos(null);
    pagosApi
      .obtener(alumno.id)
      .then(setDatos)
      .catch((err: Error) => setError(err.message));
  }, [alumno]);

  return (
    <section>
      <Link to="/membresias" className="volver">
        ← Membresías
      </Link>
      <h1>Registrar pago</h1>

      {error && <p className="mensaje-error">{error}</p>}

      {!alumno ? (
        <div className="tarjeta seccion">
          <h2>¿De qué alumno es el pago?</h2>
          <input
            className="buscador"
            type="search"
            placeholder="Buscar por nombre, apellido o DNI"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            aria-label="Buscar alumno"
            autoFocus
          />
          {resultados.length === 0 ? (
            <p className="texto-suave">No hay alumnos activos que coincidan.</p>
          ) : (
            <ul className="lista-seleccion">
              {resultados.map((resultado) => (
                <li key={resultado.id}>
                  <button type="button" onClick={() => setAlumno(resultado)}>
                    <strong>
                      {resultado.apellido}, {resultado.nombre}
                    </strong>{" "}
                    <span className="texto-suave">DNI {resultado.dni}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="tarjeta seccion">
          <div className="pagina-encabezado">
            <div>
              <h2>
                {alumno.apellido}, {alumno.nombre}
              </h2>
              {datos && (
                <div className="pago-estado">
                  <span className={claseEstadoCuota(datos.situacion.estado)}>
                    {ETIQUETAS_ESTADO_CUOTA[datos.situacion.estado]}
                  </span>
                  {datos.situacion.vence && (
                    <span>{textoVencimiento(datos.situacion.estado, datos.situacion.vence, datos.situacion.diasRestantes)}</span>
                  )}
                  <span className="texto-suave">
                    {datos.plan ? `Membresía: ${datos.plan.nombre} (${textoPrecioPlan(datos.plan.precioMensual)})` : "Sin membresía asignada"}
                  </span>
                </div>
              )}
            </div>
            <button type="button" className="boton-link" onClick={() => setAlumno(null)}>
              Cambiar alumno
            </button>
          </div>

          {!datos ? (
            <Cargando />
          ) : (
            <FormularioPago
              key={alumno.id}
              alumnoId={alumno.id}
              plan={datos.plan}
              inicioCuota={datos.situacion.inicioProximaCuota}
              cantidadAdeudadas={datos.situacion.cuotasAdeudadas.length}
              onGuardado={() => navigate("/membresias")}
              onCancelar={() => navigate("/membresias")}
            />
          )}
        </div>
      )}
    </section>
  );
}
