import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ErrorApi } from "../api/cliente";
import { planesApi, type Plan } from "../api/planes";
import { useCarga } from "../hooks/useCarga";
import { formatearMoneda } from "../utils/formato";
import { importeParaEditar } from "../utils/pagos";
import { Flecha } from "../componentes/Iconos";
import Campo from "../componentes/Campo";
import { useConfirmar } from "../componentes/Confirmar";

interface PropsEdicion {
  plan: Plan;
  onGuardado: () => void;
  onCancelar: () => void;
}

// Campo para editar el precio de un plan, dentro de su fila de la tabla.
function EdicionPrecio({ plan, onGuardado, onCancelar }: PropsEdicion) {
  const [precio, setPrecio] = useState(Number(plan.precioMensual) > 0 ? importeParaEditar(plan.precioMensual) : "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await planesApi.actualizarPrecio(plan.id, precio);
      onGuardado();
    } catch (err) {
      setError(err instanceof ErrorApi ? err.campos.precioMensual?.[0] ?? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="edicion-precio" onSubmit={enviar} noValidate>
      <input
        inputMode="decimal"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
        placeholder="Ej.: 25.000"
        aria-label={`Precio mensual de ${plan.nombre}`}
        autoFocus
      />
      <button type="submit" className="boton" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
      <button type="button" className="boton-secundario" onClick={onCancelar}>
        Cancelar
      </button>
      {error && <span className="error-campo">{error}</span>}
    </form>
  );
}

// Campo para cambiar el nombre de una membresía, dentro de su fila de la tabla.
function EdicionNombre({ plan, onGuardado, onCancelar }: PropsEdicion) {
  const [nombre, setNombre] = useState(plan.nombre);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await planesApi.cambiarNombre(plan.id, nombre);
      onGuardado();
    } catch (err) {
      setError(err instanceof ErrorApi ? err.campos.nombre?.[0] ?? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="edicion-precio" onSubmit={enviar} noValidate>
      <input
        className="edicion-nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={60}
        aria-label="Nuevo nombre"
        autoFocus
      />
      <button type="submit" className="boton" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
      <button type="button" className="boton-secundario" onClick={onCancelar}>
        Cancelar
      </button>
      {error && <span className="error-campo">{error}</span>}
    </form>
  );
}

// Formulario para agregar una membresía: nombre y precio mensual.
function NuevaMembresia({ onGuardado, onCancelar }: { onGuardado: () => Promise<void>; onCancelar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setErrores({});
    setGuardando(true);
    try {
      await planesApi.crear(nombre, precio);
      await onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      if (err instanceof ErrorApi) setErrores(err.campos);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="tarjeta seccion" onSubmit={enviar} noValidate>
      <h2>Nueva membresía</h2>
      {error && <p className="mensaje-error">{error}</p>}
      <div className="formulario-membresia">
        <Campo etiqueta="Nombre" obligatorio errores={errores.nombre}>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Pase libre" maxLength={60} autoFocus />
        </Campo>
        <Campo etiqueta="Precio mensual" obligatorio errores={errores.precioMensual}>
          <input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Ej.: 25.000" />
        </Campo>
        <div className="acciones acciones-formulario formulario-prueba-acciones">
          <button type="button" className="boton-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </div>
    </form>
  );
}

// Membresías → "Configurar membresías": precio y nombre de cada membresía, alta de membresías nuevas y baja de las
// agregadas que nadie usa (las 4 iniciales no se eliminan).
export default function GestionPlanes() {
  const { datos: planes, error, setError, recargar } = useCarga(() => planesApi.listar(), []);
  const [editando, setEditando] = useState<{ id: number; campo: "precio" | "nombre" } | null>(null);
  const [agregando, setAgregando] = useState(false);
  const confirmar = useConfirmar();

  function editar(id: number, campo: "precio" | "nombre") {
    setError("");
    setEditando({ id, campo });
  }

  // Si alguien la usa, el servidor responde por qué no se puede y se muestra ese mensaje.
  async function eliminar(plan: Plan) {
    setError("");
    if (
      plan.eliminable &&
      !(await confirmar({ titulo: `¿Eliminar la membresía "${plan.nombre}"?`, mensaje: "No se puede deshacer.", textoConfirmar: "Eliminar", peligro: true }))
    ) {
      return;
    }
    try {
      await planesApi.eliminar(plan.id);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  async function agregada() {
    setAgregando(false);
    await recargar();
  }

  async function guardado() {
    setEditando(null);
    await recargar();
  }

  return (
    <section>
      <Link to="/membresias" className="volver">
        <Flecha hacia="atras" />
        Membresías
      </Link>
      {agregando ? (
        <h1>Configurar membresías</h1>
      ) : (
        <div className="pagina-encabezado">
          <h1>Configurar membresías</h1>
          <button type="button" className="boton" onClick={() => setAgregando(true)}>
            + Agregar membresía
          </button>
        </div>
      )}
      <p className="texto-suave">
        Precio mensual de cada membresía. Es el importe que se propone al cobrar la cuota (se puede cambiar en cada pago).
        Cambiar un precio no modifica las cuotas ya cobradas. Las membresías agregadas se pueden eliminar mientras ningún
        alumno la tenga ni haya cuotas cobradas con ella.
      </p>

      {agregando && <NuevaMembresia onGuardado={agregada} onCancelar={() => setAgregando(false)} />}

      {error && <p className="mensaje-error">{error}</p>}

      {planes && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Membresía</th>
                <th>Precio mensual</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {planes.map((plan) => (
                <tr key={plan.id}>
                  {/* El nombre se edita en la celda de la membresía (en el celular queda bajo la etiqueta "Membresía"). */}
                  {editando?.id === plan.id && editando.campo === "nombre" ? (
                    <td colSpan={3}>
                      <EdicionNombre plan={plan} onGuardado={guardado} onCancelar={() => setEditando(null)} />
                    </td>
                  ) : (
                    <td>
                      <strong>{plan.nombre}</strong>
                    </td>
                  )}
                  {editando?.id === plan.id ? (
                    editando.campo === "precio" && (
                      <td colSpan={2}>
                        <EdicionPrecio plan={plan} onGuardado={guardado} onCancelar={() => setEditando(null)} />
                      </td>
                    )
                  ) : (
                    <>
                      <td className="sin-salto">
                        {Number(plan.precioMensual) > 0 ? (
                          formatearMoneda(plan.precioMensual)
                        ) : (
                          <span className="insignia insignia-aviso">Sin precio definido</span>
                        )}
                      </td>
                      <td className="sin-salto">
                        <button type="button" className="boton-link" onClick={() => editar(plan.id, "precio")}>
                          {Number(plan.precioMensual) > 0 ? "Cambiar precio" : "Definir precio"}
                        </button>
                        <button type="button" className="boton-link" onClick={() => editar(plan.id, "nombre")}>
                          Cambiar nombre
                        </button>
                        {plan.modalidad === null && (
                          <button type="button" className="boton-link peligro" onClick={() => eliminar(plan)}>
                            Eliminar
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
