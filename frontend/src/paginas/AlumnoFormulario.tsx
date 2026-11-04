import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { alumnosApi, type Alumno, type DatosAlumno } from "../api/alumnos";
import { ErrorApi } from "../api/cliente";
import Campo from "../componentes/Campo";
import Cargando from "../componentes/Cargando";
import { ETIQUETAS_CAMPO, ETIQUETAS_PERFIL } from "../utils/alumnos";
import { hoyComoTexto } from "../utils/formato";

const VACIO: DatosAlumno = {
  nombre: "",
  apellido: "",
  dni: "",
  fechaNacimiento: "",
  telefono: "",
  email: "",
  profesion: "",
  perfil: "",
  detallePerfil: "",
  lesiones: "",
  molestias: "",
  actividadLaboral: "",
  otrosDatos: "",
};

// Pasa la ficha que viene de la API al formato del formulario (null → texto vacío).
function datosDesdeAlumno(alumno: Alumno): DatosAlumno {
  return {
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    dni: alumno.dni,
    fechaNacimiento: alumno.fechaNacimiento.slice(0, 10),
    telefono: alumno.telefono,
    email: alumno.email ?? "",
    profesion: alumno.profesion,
    perfil: alumno.perfil,
    detallePerfil: alumno.detallePerfil ?? "",
    lesiones: alumno.lesiones ?? "",
    molestias: alumno.molestias ?? "",
    actividadLaboral: alumno.actividadLaboral ?? "",
    otrosDatos: alumno.otrosDatos ?? "",
  };
}

const CAMPOS_TEXTO_LARGO = [
  "lesiones",
  "molestias",
  "actividadLaboral",
  "otrosDatos",
] as const;

// Se usa para alta (/alumnos/nuevo) y para edición (/alumnos/:id/editar).
export default function AlumnoFormulario() {
  const { id } = useParams();
  const esEdicion = id !== undefined;
  const desdeInicio = useLocation().state?.desde === "inicio"; // "Nuevo Alumno" de Inicio
  const navigate = useNavigate();

  const [datos, setDatos] = useState<DatosAlumno>(VACIO);
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!esEdicion) return;
    alumnosApi
      .obtener(Number(id))
      .then((alumno) => setDatos(datosDesdeAlumno(alumno)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setCargando(false));
  }, [esEdicion, id]);

  function control(campo: keyof DatosAlumno) {
    return {
      name: campo,
      value: datos[campo],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setDatos((anteriores) => ({ ...anteriores, [campo]: e.target.value })),
    };
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setErrores({});
    setGuardando(true);
    try {
      const alumno = esEdicion ? await alumnosApi.actualizar(Number(id), datos) : await alumnosApi.crear(datos);
      navigate(`/alumnos/${alumno.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      if (err instanceof ErrorApi) setErrores(err.campos);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <Cargando />;
  }

  const volverA = esEdicion ? `/alumnos/${id}` : desdeInicio ? "/" : "/alumnos";

  return (
    <section>
      <Link to={volverA} className="volver">
        ← Volver
      </Link>
      <h1>{esEdicion ? "Editar alumno" : "Nuevo alumno"}</h1>

      {error && <p className="mensaje-error">{error}</p>}

      <form onSubmit={enviar} noValidate>
        <div className="tarjeta seccion">
          <h2>Datos personales</h2>
          <div className="grilla">
            <Campo etiqueta="Nombre" obligatorio errores={errores.nombre}>
              <input {...control("nombre")} autoFocus />
            </Campo>
            <Campo etiqueta="Apellido" obligatorio errores={errores.apellido}>
              <input {...control("apellido")} />
            </Campo>
            <Campo etiqueta="DNI" obligatorio errores={errores.dni} ayuda="Sin puntos">
              <input {...control("dni")} inputMode="numeric" />
            </Campo>
            <Campo etiqueta="Fecha de nacimiento" obligatorio errores={errores.fechaNacimiento}>
              <input {...control("fechaNacimiento")} type="date" max={hoyComoTexto()} />
            </Campo>
            <Campo
              etiqueta="Teléfono"
              obligatorio
              errores={errores.telefono}
              ayuda="Código de área sin 0 y número sin 15 (ej.: 341 6123456)"
            >
              <input {...control("telefono")} type="tel" />
            </Campo>
            <Campo etiqueta="Email" errores={errores.email}>
              <input {...control("email")} type="email" />
            </Campo>
            <Campo etiqueta="Profesión" obligatorio errores={errores.profesion}>
              <input {...control("profesion")} />
            </Campo>
          </div>
        </div>

        <div className="tarjeta seccion">
          <h2>Perfil</h2>
          <div className="grilla">
            <Campo etiqueta="Perfil" obligatorio errores={errores.perfil}>
              <select {...control("perfil")}>
                <option value="">Elegí un perfil…</option>
                {Object.entries(ETIQUETAS_PERFIL).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo
            etiqueta="Detalle del perfil"
            errores={errores.detallePerfil}
            ayuda="Ej.: deporte que practica, objetivo, lesión de la que se recupera"
          >
            <textarea {...control("detallePerfil")} rows={2} />
          </Campo>
        </div>

        <div className="tarjeta seccion">
          <h2>Antecedentes y salud</h2>
          {CAMPOS_TEXTO_LARGO.map((campo) => (
            <Campo key={campo} etiqueta={ETIQUETAS_CAMPO[campo]} errores={errores[campo]}>
              <textarea {...control(campo)} rows={3} />
            </Campo>
          ))}
        </div>

        <div className="acciones">
          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear alumno"}
          </button>
          <Link to={volverA} className="boton-secundario">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
