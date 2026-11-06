import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ErrorApi } from "../api/cliente";
import { perfilesApi, type DatosPerfil, type Perfil } from "../api/perfiles";
import Campo from "../componentes/Campo";
import Cargando from "../componentes/Cargando";
import { useCarga } from "../hooks/useCarga";

const PERFIL_VACIO: DatosPerfil = { nombre: "", mesesReevaluacion: "" };

const textoMeses = (meses: number) => (meses === 1 ? "Cada 1 mes" : `Cada ${meses} meses`);

interface PropsFormulario {
  inicial: DatosPerfil;
  textoBoton: string;
  onGuardar: (datos: DatosPerfil) => Promise<void>;
  onCancelar?: () => void;
}

function FormularioPerfil({ inicial, textoBoton, onGuardar, onCancelar }: PropsFormulario) {
  const [datos, setDatos] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setErrores({});
    setGuardando(true);
    try {
      await onGuardar(datos);
      setDatos(PERFIL_VACIO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      if (err instanceof ErrorApi) setErrores(err.campos);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      {error && <p className="mensaje-error">{error}</p>}
      <div className="formulario-perfil">
        <Campo etiqueta="Nombre" obligatorio errores={errores.nombre}>
          <input
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            placeholder="Ej.: Adultos mayores"
          />
        </Campo>
        <Campo etiqueta="Reevaluación cada (meses)" obligatorio errores={errores.mesesReevaluacion}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={24}
            value={datos.mesesReevaluacion}
            onChange={(e) => setDatos({ ...datos, mesesReevaluacion: e.target.value })}
            placeholder="Ej.: 3"
          />
        </Campo>
        <div className="acciones acciones-formulario formulario-prueba-acciones">
          {onCancelar && (
            <button type="button" className="boton-secundario" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? "Guardando…" : textoBoton}
          </button>
        </div>
      </div>
    </form>
  );
}

// Configuración → Perfiles: nombre de cada perfil y cada cuántos meses se reevalúa a sus alumnos.
export default function Perfiles() {
  const { datos: perfiles, error, setError, recargar } = useCarga(() => perfilesApi.listar(), []);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  async function crear(datos: DatosPerfil) {
    await perfilesApi.crear(datos);
    await recargar();
  }

  async function actualizar(id: number, datos: DatosPerfil) {
    await perfilesApi.actualizar(id, datos);
    setEditandoId(null);
    await recargar();
  }

  // Solo se puede eliminar un perfil que no tiene ningún alumno.
  async function eliminar(perfil: Perfil) {
    if (perfil.alumnos > 0) {
      const cuantos = perfil.alumnos === 1 ? "1 alumno lo tiene" : `${perfil.alumnos} alumnos lo tienen`;
      setError(`No se puede eliminar "${perfil.nombre}": ${cuantos}. Primero cambiales el perfil desde su ficha.`);
      return;
    }
    if (!window.confirm(`¿Eliminar el perfil "${perfil.nombre}"?`)) return;
    try {
      await perfilesApi.eliminar(perfil.id);
      setError("");
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <section>
      <Link to="/configuracion" className="volver">
        ← Configuración
      </Link>
      <h1>Perfiles</h1>

      <div className="tarjeta seccion">
        <h2>Nuevo perfil</h2>
        <FormularioPerfil inicial={PERFIL_VACIO} textoBoton="Agregar" onGuardar={crear} />
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      {!perfiles ? (
        !error && <Cargando />
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Reevaluación</th>
                <th>Alumnos</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {perfiles.map((perfil) =>
                editandoId === perfil.id ? (
                  <tr key={perfil.id}>
                    <td colSpan={4}>
                      <FormularioPerfil
                        inicial={{ nombre: perfil.nombre, mesesReevaluacion: String(perfil.mesesReevaluacion) }}
                        textoBoton="Guardar"
                        onGuardar={(datos) => actualizar(perfil.id, datos)}
                        onCancelar={() => setEditandoId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={perfil.id}>
                    <td>{perfil.nombre}</td>
                    <td>{textoMeses(perfil.mesesReevaluacion)}</td>
                    <td>{perfil.alumnos}</td>
                    <td className="sin-salto">
                      <button type="button" className="boton-link" onClick={() => setEditandoId(perfil.id)}>
                        Editar
                      </button>
                      <button type="button" className="boton-link peligro" onClick={() => eliminar(perfil)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="texto-suave">
        Cambiar los meses de un perfil existente, mueve la próxima evaluación de todos los alumnos con ese perfil,
        contando desde su última evaluación.
      </p>
    </section>
  );
}
