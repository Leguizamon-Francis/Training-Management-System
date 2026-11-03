import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { alumnosApi } from "../api/alumnos";
import AnotacionesAlumno from "../componentes/AnotacionesAlumno";
import AsistenciasFicha from "../componentes/AsistenciasFicha";
import BotonVerTodos from "../componentes/BotonVerTodos";
import Cargando from "../componentes/Cargando";
import Desplegable from "../componentes/Desplegable";
import EvaluacionesAlumno from "../componentes/EvaluacionesAlumno";
import PagosAlumno from "../componentes/PagosAlumno";
import RutinasFicha from "../componentes/RutinasFicha";
import { useCarga } from "../hooks/useCarga";
import { useListaCorta } from "../hooks/useListaCorta";
import { ETIQUETAS_CAMPO, ETIQUETAS_PERFIL, formatearValorCambio } from "../utils/alumnos";
import { calcularEdad, formatearFecha, formatearFechaHora } from "../utils/formato";

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="dato">
      <dt>{etiqueta}</dt>
      <dd>{children || <span className="texto-suave">—</span>}</dd>
    </div>
  );
}

export default function AlumnoFicha() {
  const idAlumno = Number(useParams().id);
  const { datos, error, setError, recargar } = useCarga(
    () => Promise.all([alumnosApi.obtener(idAlumno), alumnosApi.historial(idAlumno)]),
    [idAlumno],
  );
  const historial = useListaCorta(datos?.[1] ?? [], 4);
  const [procesando, setProcesando] = useState(false);

  if (!datos) {
    return error ? (
      <>
        <p className="mensaje-error">{error}</p>
        <Link to="/alumnos">← Volver a alumnos</Link>
      </>
    ) : (
      <Cargando />
    );
  }

  const [alumno, cambios] = datos;

  async function alternarEstado() {
    const nombre = `${alumno.nombre} ${alumno.apellido}`;
    const pregunta = alumno.activo
      ? `¿Dar de baja a ${nombre}? Sus datos se conservan y se puede reactivar cuando quieras.`
      : `¿Reactivar a ${nombre}?`;
    if (!window.confirm(pregunta)) return;

    setProcesando(true);
    try {
      await alumnosApi.cambiarEstado(alumno.id, !alumno.activo);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section>
      <Link to="/alumnos" className="volver">
        ← Alumnos
      </Link>

      <div className="pagina-encabezado">
        <div>
          <h1>
            {alumno.apellido}, {alumno.nombre}
          </h1>
          <div className="insignias">
            <span className="insignia">{ETIQUETAS_PERFIL[alumno.perfil]}</span>
            <span className={alumno.activo ? "insignia insignia-ok" : "insignia"}>
              {alumno.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
        <div className="acciones">
          <Link to={`/alumnos/${alumno.id}/editar`} className="boton">
            Editar
          </Link>
          <button type="button" className="boton-secundario" onClick={alternarEstado} disabled={procesando}>
            {alumno.activo ? "Dar de baja" : "Reactivar"}
          </button>
        </div>
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      <Desplegable titulo="Datos personales">
        <dl className="datos">
          <Dato etiqueta="DNI">{alumno.dni}</Dato>
          <Dato etiqueta="Fecha de nacimiento">
            {formatearFecha(alumno.fechaNacimiento)} ({calcularEdad(alumno.fechaNacimiento)} años)
          </Dato>
          <Dato etiqueta="Teléfono">{alumno.telefono}</Dato>
          <Dato etiqueta="Email">{alumno.email}</Dato>
          <Dato etiqueta="Profesión">{alumno.profesion}</Dato>
          <Dato etiqueta="Alta en el sistema">{formatearFecha(alumno.creadoEn)}</Dato>
          <Dato etiqueta="Perfil">{ETIQUETAS_PERFIL[alumno.perfil]}</Dato>
          <Dato etiqueta="Detalle del perfil">{alumno.detallePerfil}</Dato>
        </dl>
      </Desplegable>

      <Desplegable titulo="Antecedentes y salud">
        <dl className="datos datos-texto">
          <Dato etiqueta="Lesiones">{alumno.lesiones}</Dato>
          <Dato etiqueta="Molestias/contracturas">{alumno.molestias}</Dato>
          <Dato etiqueta="Actividad laboral">{alumno.actividadLaboral}</Dato>
          <Dato etiqueta="Otros datos">{alumno.otrosDatos}</Dato>
        </dl>
      </Desplegable>

      <AnotacionesAlumno alumnoId={alumno.id} />

      <EvaluacionesAlumno alumnoId={alumno.id} />

      <RutinasFicha alumno={alumno} />

      <AsistenciasFicha alumnoId={alumno.id} />

      <PagosAlumno alumno={alumno} onCambio={recargar} />

      <Desplegable titulo="Historial de cambios">
        {cambios.length === 0 ? (
          <p className="texto-suave">Sin cambios registrados desde el alta.</p>
        ) : (
          <>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Campo</th>
                    <th>Antes</th>
                    <th>Después</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.visibles.map((cambio) => (
                    <tr key={cambio.id}>
                      <td className="sin-salto">{formatearFechaHora(cambio.fecha)}</td>
                      <td>{ETIQUETAS_CAMPO[cambio.campo] ?? cambio.campo}</td>
                      <td className="texto-largo">{formatearValorCambio(cambio.campo, cambio.valorAnterior)}</td>
                      <td className="texto-largo">{formatearValorCambio(cambio.campo, cambio.valorNuevo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <BotonVerTodos lista={historial} />
          </>
        )}
      </Desplegable>
    </section>
  );
}
