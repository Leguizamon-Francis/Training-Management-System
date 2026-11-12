import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { ErrorApi } from "../api/cliente";
import { rutinaAlumnoApi, type ClaveSemana, type EjercicioPlanilla } from "../api/rutinaAlumno";
import Cargando from "../componentes/Cargando";
import { Logo } from "../componentes/Iconos";
import { useCarga } from "../hooks/useCarga";
import { formatearFecha } from "../utils/formato";

// Pantalla del alumno (sin usuario, con el link que le pasó el profesor): elige el día y la semana, ve todos los
// ejercicios de ese día y puede cambiar cualquier casillero. Lo que escribe se guarda solo, a los pocos segundos.

const ESPERA_GUARDADO_MS = 1000;
const REINTENTO_MS = 5000;

const COLUMNAS: { clave: ClaveSemana; titulo: string }[] = [
  { clave: "series", titulo: "Series" },
  { clave: "reps", titulo: "Reps" },
  { clave: "rpe", titulo: "RPE" },
  { clave: "kgsSugeridos", titulo: "Kgs sug." },
  { clave: "kgs", titulo: "Kgs" },
];

type Estado = "guardado" | "pendiente" | "guardando" | "error" | "cortado";

const TEXTO_ESTADO: Record<Estado, string> = {
  guardado: "Todo guardado",
  pendiente: "Guardando…",
  guardando: "Guardando…",
  error: "Sin conexión: se guarda cuando vuelva",
  cortado: "El link ya no está activo: lo último no se guardó",
};

export default function RutinaAlumno() {
  const { centro = "", link = "" } = useParams();
  const { datos, error } = useCarga(() => rutinaAlumnoApi.obtener(centro, link), [centro, link]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [dia, setDia] = useState<number | null>(null);
  const [semana, setSemana] = useState<number | null>(null);
  const [verVacios, setVerVacios] = useState(false);
  const [estado, setEstado] = useState<Estado>("guardado");

  const pendientes = useRef<Record<string, string>>({}); // cambios todavía sin guardar
  const enCurso = useRef(false);
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (datos) setValores(datos.valores);
  }, [datos]);

  const guardar = useCallback(async () => {
    window.clearTimeout(temporizador.current);
    if (enCurso.current || Object.keys(pendientes.current).length === 0) return;
    const cambios = pendientes.current;
    pendientes.current = {};
    enCurso.current = true;
    setEstado("guardando");
    try {
      await rutinaAlumnoApi.guardar(centro, link, cambios);
      enCurso.current = false;
      if (Object.keys(pendientes.current).length > 0) void guardar(); // lo que se escribió mientras tanto
      else setEstado("guardado");
    } catch (err) {
      enCurso.current = false;
      // El profesor cortó el link o la rutina venció: no tiene sentido reintentar.
      if (err instanceof ErrorApi && (err.estado === 404 || err.estado === 410)) {
        setEstado("cortado");
        return;
      }
      pendientes.current = { ...cambios, ...pendientes.current }; // lo más nuevo gana
      setEstado("error");
      temporizador.current = window.setTimeout(() => void guardar(), REINTENTO_MS);
    }
  }, [centro, link]);

  function cambiar(campo: string, valor: string) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    pendientes.current[campo] = valor;
    setEstado((actual) => (actual === "error" || actual === "cortado" ? actual : "pendiente"));
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => void guardar(), ESPERA_GUARDADO_MS);
  }

  // Si el alumno cierra o cambia de aplicación con cambios sin guardar, se mandan igual.
  useEffect(() => {
    function alEsconder() {
      if (document.visibilityState === "hidden") void guardar();
    }
    function antesDeCerrar(evento: BeforeUnloadEvent) {
      if (Object.keys(pendientes.current).length > 0 || enCurso.current) evento.preventDefault();
    }
    document.addEventListener("visibilitychange", alEsconder);
    window.addEventListener("beforeunload", antesDeCerrar);
    return () => {
      document.removeEventListener("visibilitychange", alEsconder);
      window.removeEventListener("beforeunload", antesDeCerrar);
    };
  }, [guardar]);

  if (!datos) {
    return (
      <main className="rutina-alumno">
        <Encabezado />
        {error ? <p className="mensaje-error">{error}</p> : <Cargando />}
      </main>
    );
  }

  const v = (campo: string) => valores[campo] ?? "";

  // Días con algún ejercicio escrito (si no hay ninguno, se ofrecen todos).
  const conEjercicios = datos.dias.map((d) => d.ejercicios.some((e) => v(e.ejercicio).trim()));
  const diasVisibles = datos.dias.map((d, i) => ({ ...d, indice: i })).filter((_, i) => conEjercicios[i] || !conEjercicios.some(Boolean));
  const cantidadSemanas = datos.dias[0]?.ejercicios[0]?.semanas.length ?? 0;

  const ejercicios = dia !== null && semana !== null ? datos.dias[dia].ejercicios : [];
  const tieneAlgo = (e: EjercicioPlanilla) =>
    [e.ejercicio, e.numero, e.notas, e.rm].some((campo) => v(campo).trim()) ||
    Object.values(e.semanas[semana ?? 0]).flat().some((campo) => v(campo).trim());
  const llenos = ejercicios.filter(tieneAlgo);
  const vacios = ejercicios.filter((e) => !tieneAlgo(e));

  return (
    <main className="rutina-alumno">
      <Encabezado />
      <h1>{datos.nombre ? `Rutina de ${datos.nombre}` : "Rutina"}</h1>
      <p className="texto-suave">
        {datos.deporte && `${datos.deporte} · `}
        Del {formatearFecha(datos.desde)} al {formatearFecha(datos.hasta)}
      </p>

      <div className="rutina-alumno-barra">
        <div className="selector-chips" role="group" aria-label="Día">
          {diasVisibles.map((d) => (
            <button
              key={d.indice}
              type="button"
              className={dia === d.indice ? "chip chip-activo" : "chip"}
              aria-pressed={dia === d.indice}
              onClick={() => setDia(d.indice)}
            >
              {d.titulo.replace("Dia", "Día")}
            </button>
          ))}
        </div>
        {dia !== null && (
          <div className="selector-chips" role="group" aria-label="Semana">
            {Array.from({ length: cantidadSemanas }, (_, s) => (
              <button
                key={s}
                type="button"
                className={semana === s ? "chip chip-activo" : "chip"}
                aria-pressed={semana === s}
                onClick={() => setSemana(s)}
              >
                Semana {s + 1}
              </button>
            ))}
          </div>
        )}
        <p className={`indicador-guardado estado-${estado}`} role="status">
          {TEXTO_ESTADO[estado]}
        </p>
      </div>

      {dia === null ? (
        <p className="texto-suave">Elegí el día.</p>
      ) : semana === null ? (
        <p className="texto-suave">Elegí la semana.</p>
      ) : (
        <>
          {llenos.length === 0 && <p className="texto-suave">Este día todavía no tiene ejercicios en esta semana.</p>}
          {(verVacios ? ejercicios : llenos).map((e) => (
            <Ejercicio key={e.ejercicio} ejercicio={e} semana={semana} v={v} cambiar={cambiar} />
          ))}
          {vacios.length > 0 && (
            <button type="button" className="boton-secundario boton-ancho" onClick={() => setVerVacios(!verVacios)}>
              {verVacios ? "Ocultar ejercicios vacíos" : `Mostrar ejercicios vacíos (${vacios.length})`}
            </button>
          )}
        </>
      )}
    </main>
  );
}

function Encabezado() {
  return (
    <header className="rutina-alumno-marca">
      <Logo />
      <span>DV Training</span>
    </header>
  );
}

interface PropsEjercicio {
  ejercicio: EjercicioPlanilla;
  semana: number;
  v: (campo: string) => string;
  cambiar: (campo: string, valor: string) => void;
}

function Ejercicio({ ejercicio: e, semana, v, cambiar }: PropsEjercicio) {
  const campos = e.semanas[semana];
  const texto = (campo: string, etiqueta: string, varias = false) => (
    <label className="campo">
      {etiqueta}
      {varias ? (
        <textarea rows={2} value={v(campo)} onChange={(ev) => cambiar(campo, ev.target.value)} />
      ) : (
        <input type="text" value={v(campo)} onChange={(ev) => cambiar(campo, ev.target.value)} />
      )}
    </label>
  );

  return (
    <article className="tarjeta ejercicio-alumno">
      <div className="ejercicio-alumno-titulo">
        <input
          type="text"
          className="ejercicio-alumno-numero"
          value={v(e.numero)}
          onChange={(ev) => cambiar(e.numero, ev.target.value)}
          aria-label="Número"
          placeholder="N°"
        />
        <input
          type="text"
          value={v(e.ejercicio)}
          onChange={(ev) => cambiar(e.ejercicio, ev.target.value)}
          aria-label="Ejercicio"
          placeholder="Ejercicio"
        />
      </div>

      {texto(e.notas, "Notas", true)}
      <div className="ejercicio-alumno-dos">
        {texto(e.descanso, "Descanso")}
        {texto(e.rm, "RM anteriores")}
      </div>

      <table className="series-alumno">
        <thead>
          <tr>
            {COLUMNAS.map((c) => (
              <th key={c.clave} scope="col">
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1].map((renglon) => (
            <tr key={renglon}>
              {COLUMNAS.map((c) => {
                const campo = campos[c.clave][renglon];
                return (
                  <td key={c.clave}>
                    <input
                      type="text"
                      value={v(campo)}
                      onChange={(ev) => cambiar(campo, ev.target.value)}
                      aria-label={`${c.titulo}, renglón ${renglon + 1}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {texto(campos.anotaciones[0], "Anotaciones", true)}
      {texto(campos.correcciones[0], "Correcciones", true)}
    </article>
  );
}
