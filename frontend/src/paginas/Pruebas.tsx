import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ErrorApi } from "../api/cliente";
import { pruebasApi, type DatosPrueba, type Prueba } from "../api/pruebas";
import Campo from "../componentes/Campo";
import { useCarga } from "../hooks/useCarga";
import { ETIQUETAS_CATEGORIA } from "../utils/evaluaciones";
import { useConfirmar } from "../componentes/Confirmar";
import { Flecha } from "../componentes/Iconos";

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
        Es unilateral (un resultado por lado)
      </label>
    </form>
  );
}

export default function Pruebas() {
  const confirmar = useConfirmar();
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

  // "Desactivar": deja de ofrecerse al cargar evaluaciones; "Restaurar" la vuelve a activar.
  async function alternarActiva(prueba: Prueba) {
    if (
      prueba.activa &&
      !(await confirmar({ titulo: `¿Desactivar "${prueba.nombre}"?`, mensaje: "Se puede restaurar más adelante.", textoConfirmar: "Desactivar" }))
    ) {
      return;
    }
    try {
      await pruebasApi.actualizar(prueba.id, { ...prueba, activa: !prueba.activa });
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  // "Eliminar": permanente. Los resultados que ya se cargaron con esa prueba se conservan.
  async function eliminar(prueba: Prueba) {
    const si = await confirmar({
      titulo: `¿Eliminar "${prueba.nombre}" para siempre?`,
      mensaje: "Deja de aparecer acá y no se puede deshacer. Los resultados que ya se cargaron se conservan en las evaluaciones de cada alumno.",
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!si) return;
    try {
      await pruebasApi.eliminar(prueba.id);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <section>
      <Link to="/evaluaciones" className="volver">
        <Flecha hacia="atras" />
        Evaluaciones
      </Link>
      <h1>Configuración de evaluaciones</h1>

      <div className="tarjeta seccion">
        <h2>Nueva prueba</h2>
        <FormularioPrueba inicial={PRUEBA_VACIA} textoBoton="Agregar" onGuardar={crear} />
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      <label className="casilla">
        <input type="checkbox" checked={incluirInactivas} onChange={(e) => setIncluirInactivas(e.target.checked)} />
        Mostrar también las desactivadas
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
                        {prueba.activa ? "Activa" : "Desactivada"}
                      </span>
                    </td>
                    <td className="sin-salto">
                      <button type="button" className="boton-link" onClick={() => setEditandoId(prueba.id)}>
                        Editar
                      </button>
                      {prueba.activa ? (
                        <button type="button" className="boton-link" onClick={() => alternarActiva(prueba)}>
                          Desactivar
                        </button>
                      ) : (
                        <button type="button" className="boton-link" onClick={() => alternarActiva(prueba)}>
                          Restaurar
                        </button>
                      )}
                      <button type="button" className="boton-link peligro" onClick={() => eliminar(prueba)}>
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
    </section>
  );
}
