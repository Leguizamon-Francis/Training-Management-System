import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Alumno } from "../api/alumnos";
import { panelApi } from "../api/panel";
import { useCarga } from "../hooks/useCarga";
import { claseProximaEvaluacion, textoDiasRestantes } from "../utils/evaluaciones";
import { formatearFecha, formatearMoneda } from "../utils/formato";
import { claseEstadoCuota, ETIQUETAS_ESTADO_CUOTA } from "../utils/pagos";

// Las pantallas a las que llevan los cuadros muestran un enlace "Apellido, Nombre" para volver a la ficha (VolverAlumno).
const DESDE_FICHA = { desde: "ficha" };

// "seccion": a dónde lleva, para el mensaje que aparece al apoyar el cursor ("Ir a …").
function Casilla({ titulo, a, seccion, valor, detalle }: { titulo: string; a: string; seccion: string; valor: ReactNode; detalle: ReactNode }) {
  return (
    <Link to={a} state={DESDE_FICHA} title={`Ir a ${seccion}`} className="tarjeta casilla-resumen">
      <span className="casilla-resumen-titulo">{titulo}</span>
      <span className="casilla-resumen-valor">{valor}</span>
      <span className="casilla-resumen-detalle">{detalle}</span>
    </Link>
  );
}

function hace(dias: number) {
  if (dias === 0) return "Hoy";
  return `Hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

// Lo más importante del alumno a la vista al entrar a su ficha: cada casilla lleva a su pantalla.
// Se vuelve a pedir cuando la ficha se recarga (ej.: después de registrar un pago).
export default function ResumenAlumno({ alumno }: { alumno: Alumno }) {
  const { datos: resumen } = useCarga(() => panelApi.resumenAlumno(alumno.id), [alumno]);
  if (!resumen) return <div className="resumen-alumno resumen-alumno-cargando" />;

  const { membresia, ultimaAsistencia, proximaEvaluacion, rutina } = resumen;
  const deuda =
    membresia.cuotasAdeudadas > 0
      ? `Debe ${Number(membresia.deudaTotal) > 0 ? `${formatearMoneda(membresia.deudaTotal)} ` : ""}(${membresia.cuotasAdeudadas} ${membresia.cuotasAdeudadas === 1 ? "cuota" : "cuotas"})`
      : "";

  return (
    <div className="resumen-alumno">
      {/* Membresía, perfil y estado de la cuota, uno por línea; la deuda solo si debe. */}
      <Link to={`/membresias/alumnos/${alumno.id}`} state={DESDE_FICHA} title="Ir a Membresías" className="tarjeta casilla-resumen">
        <span className="casilla-resumen-linea">
          <span className="casilla-resumen-titulo">Membresía:</span> {membresia.plan ?? "Sin membresía"}
        </span>
        <span className="casilla-resumen-linea">
          <span className="casilla-resumen-titulo">Perfil:</span> {alumno.perfil.nombre}
        </span>
        <span className="casilla-resumen-linea">
          <span className="casilla-resumen-titulo">Estado:</span>{" "}
          <span className={claseEstadoCuota(membresia.estado)}>{ETIQUETAS_ESTADO_CUOTA[membresia.estado]}</span>
        </span>
        {deuda && <span className="casilla-resumen-detalle">{deuda}</span>}
      </Link>
      <Casilla
        titulo="Última asistencia"
        a={`/asistencias/${alumno.id}`}
        seccion="Asistencias"
        valor={ultimaAsistencia ? formatearFecha(ultimaAsistencia.fecha) : "—"}
        detalle={ultimaAsistencia ? hace(ultimaAsistencia.diasDesde) : "Todavía no vino"}
      />
      <Casilla
        titulo="Próxima evaluación"
        a={`/evaluaciones/alumnos/${alumno.id}`}
        seccion="Evaluaciones"
        valor={formatearFecha(proximaEvaluacion.fecha)}
        detalle={<span className={claseProximaEvaluacion(proximaEvaluacion)}>{textoDiasRestantes(proximaEvaluacion)}</span>}
      />
      <Casilla
        titulo={rutina ? "Rutina hasta el" : "Rutina"}
        a={`/rutinas/${alumno.id}`}
        seccion="Rutinas"
        valor={rutina ? formatearFecha(rutina.hasta) : "—"}
        detalle={
          !rutina ? (
            "Sin rutina"
          ) : rutina.diasRestantes < 0 ? (
            <span className="insignia insignia-alerta">Terminó {hace(-rutina.diasRestantes).toLowerCase()}</span>
          ) : rutina.diasRestantes <= 7 ? (
            <span className="insignia insignia-aviso">{rutina.diasRestantes === 0 ? "Termina hoy" : `Termina en ${rutina.diasRestantes} días`}</span>
          ) : (
            `Faltan ${rutina.diasRestantes} días`
          )
        }
      />
    </div>
  );
}
