import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ErrorApi } from "../api/cliente";
import { pruebasApi, type DatosPrueba, type Prueba } from "../api/pruebas";
import Campo from "../componentes/Campo";
import { useCarga } from "../hooks/useCarga";
import { ETIQUETAS_CATEGORIA } from "../utils/evaluaciones";

const PRUEBA_VACIA: DatosPrueba = { nombre: "", categoria: "", unidad: "", porLado: false, activa: true };

interface PropsFormulario {
  inicial: DatosPrueba;
  textoBoton: string;
  onGuardar: (datos: DatosPrueba) => Promise<void>;
  onCancelar?: () => void;
}

function FormularioPrueba({ inicial, textoBoton, onGuardar, onCancelar }: PropsFormulario) {
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
      setDatos(PRUEBA_VACIA);
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
      <div className="formulario-prueba">
        <Campo etiqueta="Nombre" obligatorio errores={errores.nombre}>
          <input
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            placeholder="Ej.: Sprint 10 m"
          />
        </Campo>
        <Campo etiqueta="Categoría" obligatorio errores={errores.categoria}>
          <select
            value={datos.categoria}
            onChange={(e) => setDatos({ ...datos, categoria: e.target.value as DatosPrueba["categoria"] })}
          >
            <option value="">Elegí…</option>
            {Object.entries(ETIQUETAS_CATEGORIA).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Unidad" obligatorio errores={errores.unidad}>
          <input
            value={datos.unidad}
            onChange={(e) => setDatos({ ...datos, unidad: e.target.value })}
            placeholder="Ej.: s"
          />
        </Campo>
        <div className="acciones formulario-prueba-acciones">
          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? "Guardando…" : textoBoton}
          </button>
          {onCancelar && (
            <button type="button" className="boton-secundario" onClick={onCancelar}>
              Cancelar
            </button>
          )}
        </div>
      </div>
      <label className="casilla">
        <input
          type="checkbox"
          checked={datos.porLado}
          onChange={(e) => setDatos({ ...datos, porLado: e.target.checked })}
        />
        Se mide por lado (izquierdo / derecho)
      </label>
    </form>
  );
}

export default function Pruebas() {
  const [incluirInactivas, setIncluirInactivas] = useState(false);
  const { datos: pruebas, error, setError, recargar } = useCarga(() => pruebasApi.listar(incluirInactivas), [incluirInactivas]);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  async function crear(datos: DatosPrueba) {
    await pruebasApi.crear(datos);
    await recargar();
  }

  async function actualizar(id: number, datos: DatosPrueba) {
    await pruebasApi.actualizar(id, datos);
    setEditandoId(null);
    await recargar();
  }

  // "Eliminar" en realidad desactiva: la evaluación deja de ofrecerse, pero no se borra
  // de la base para no perder los resultados ya cargados. "Restaurar" la vuelve a activar.
  async function alternarActiva(prueba: Prueba) {
    if (prueba.activa && !window.confirm(`¿Eliminar "${prueba.nombre}"? Se puede restaurar más adelante.`)) {
      return;
    }
    try {
      await pruebasApi.actualizar(prueba.id, { ...prueba, activa: !prueba.activa });
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  return (
    <section>
      <Link to="/evaluaciones" className="volver">
        ← Evaluaciones
      </Link>
      <h1>Configuración de evaluaciones</h1>
      <p className="texto-suave">
        Catálogo de evaluaciones a realizar. Las desactivadas dejan de ofrecerse, pero sus resultados anteriores se
        conservan.
      </p>

      <div className="tarjeta seccion">
        <h2>Nueva prueba</h2>
        <FormularioPrueba inicial={PRUEBA_VACIA} textoBoton="Agregar" onGuardar={crear} />
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      <label className="casilla">
        <input type="checkbox" checked={incluirInactivas} onChange={(e) => setIncluirInactivas(e.target.checked)} />
        Mostrar también las eliminadas
      </label>

      {pruebas && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>Por lado</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pruebas.map((prueba) =>
                editandoId === prueba.id ? (
                  <tr key={prueba.id}>
                    <td colSpan={6}>
                      <FormularioPrueba
                        inicial={prueba}
                        textoBoton="Guardar"
                        onGuardar={(datos) => actualizar(prueba.id, datos)}
                        onCancelar={() => setEditandoId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={prueba.id}>
                    <td>{prueba.nombre}</td>
                    <td>{ETIQUETAS_CATEGORIA[prueba.categoria]}</td>
                    <td>{prueba.unidad}</td>
                    <td>{prueba.porLado ? "Sí" : "No"}</td>
                    <td>
                      <span className={prueba.activa ? "insignia insignia-ok" : "insignia"}>
                        {prueba.activa ? "Activa" : "Eliminada"}
                      </span>
                    </td>
                    <td className="sin-salto">
                      <button type="button" className="boton-link" onClick={() => setEditandoId(prueba.id)}>
                        Editar
                      </button>
                      {prueba.activa ? (
                        <button type="button" className="boton-link peligro" onClick={() => alternarActiva(prueba)}>
                          Eliminar
                        </button>
                      ) : (
                        <button type="button" className="boton-link" onClick={() => alternarActiva(prueba)}>
                          Restaurar
                        </button>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
