import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { alumnosApi, type AlumnoResumen, type FiltrosAlumnos } from "../api/alumnos";
import { perfilesApi } from "../api/perfiles";
import BotonVerTodos from "../componentes/BotonVerTodos";
import Cargando from "../componentes/Cargando";
import { useCarga } from "../hooks/useCarga";
import { ALUMNOS_POR_LISTA, useListaCorta } from "../hooks/useListaCorta";
import { calcularEdad } from "../utils/formato";
import { Flecha } from "../componentes/Iconos";

export default function Alumnos() {
  const desdeInicio = useLocation().state?.desde === "inicio"; // tarjeta "Alumnos activos" de Inicio
  const [filtros, setFiltros] = useState<FiltrosAlumnos>({ buscar: "", estado: "activos", perfilId: "" });
  const { datos: perfiles } = useCarga(() => perfilesApi.listar(), []);
  const [alumnos, setAlumnos] = useState<AlumnoResumen[] | null>(null);
  const [error, setError] = useState("");
  const lista = useListaCorta(alumnos ?? [], ALUMNOS_POR_LISTA);
  const verEstado = filtros.estado === "todos"; // con un solo estado elegido, la columna diría lo mismo en todas las filas

  // Se busca 300 ms después de la última tecla, para no consultar la API con cada letra.
  useEffect(() => {
    let cancelado = false;
    const espera = setTimeout(() => {
      alumnosApi
        .listar(filtros)
        .then((resultado) => {
          if (cancelado) return;
          setAlumnos(resultado);
          setError("");
        })
        .catch((err: Error) => {
          if (!cancelado) setError(err.message);
        });
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [filtros]);

  function cambiarFiltro<K extends keyof FiltrosAlumnos>(clave: K, valor: FiltrosAlumnos[K]) {
    setFiltros((anteriores) => ({ ...anteriores, [clave]: valor }));
  }

  return (
    <section>
      {desdeInicio && (
        <Link to="/" className="volver">
          <Flecha hacia="atras" />
          Inicio
        </Link>
      )}
      <h1>Alumnos</h1>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por nombre, apellido o DNI"
          value={filtros.buscar}
          onChange={(e) => cambiarFiltro("buscar", e.target.value)}
          aria-label="Buscar"
        />
        <select
          value={filtros.estado}
          onChange={(e) => cambiarFiltro("estado", e.target.value as FiltrosAlumnos["estado"])}
          aria-label="Estado"
        >
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <select
          value={filtros.perfilId}
          onChange={(e) => cambiarFiltro("perfilId", e.target.value)}
          aria-label="Perfil"
        >
          <option value="">Todos los perfiles</option>
          {perfiles?.map((perfil) => (
            <option key={perfil.id} value={perfil.id}>
              {perfil.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      {alumnos === null ? (
        !error && <Cargando />
      ) : alumnos.length === 0 ? (
        <p className="texto-suave">No hay alumnos que coincidan con la búsqueda.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Edad</th>
                <th>Perfil</th>
                <th>Teléfono</th>
                {verEstado && <th>Estado</th>}
              </tr>
            </thead>
            <tbody>
              {lista.visibles.map((alumno) => (
                <tr key={alumno.id}>
                  <td>
                    <Link to={`/alumnos/${alumno.id}`} className="enlace-fila">
                      {alumno.apellido}, {alumno.nombre}
                    </Link>
                  </td>
                  <td>{calcularEdad(alumno.fechaNacimiento)}</td>
                  <td>{alumno.perfil.nombre}</td>
                  <td>{alumno.telefono}</td>
                  {verEstado && (
                    <td>
                      <span className={alumno.activo ? "insignia insignia-ok" : "insignia"}>
                        {alumno.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <BotonVerTodos lista={lista} textoCerrar="Ver menos" />
        </div>
      )}

      {/* Debajo de la lista: el total a la izquierda y "Nuevo alumno" a la derecha. */}
      <div className="pie-lista">
        {alumnos && alumnos.length > 0 && (
          <p className="texto-suave">
            {alumnos.length} {alumnos.length === 1 ? "alumno" : "alumnos"}
          </p>
        )}
        <Link to="/alumnos/nuevo" className="boton">
          Nuevo alumno
        </Link>
      </div>
    </section>
  );
}
