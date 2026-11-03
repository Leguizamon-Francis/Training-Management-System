import { useEffect, useState } from "react";
import { Link } from "react-router";
import { alumnosApi, type AlumnoResumen, type FiltrosAlumnos } from "../api/alumnos";
import BotonVerTodos from "../componentes/BotonVerTodos";
import Cargando from "../componentes/Cargando";
import { useListaCorta } from "../hooks/useListaCorta";
import { ETIQUETAS_PERFIL } from "../utils/alumnos";
import { calcularEdad } from "../utils/formato";

export default function Alumnos() {
  const [filtros, setFiltros] = useState<FiltrosAlumnos>({ buscar: "", estado: "activos", perfil: "" });
  const [alumnos, setAlumnos] = useState<AlumnoResumen[] | null>(null);
  const [error, setError] = useState("");
  const lista = useListaCorta(alumnos ?? [], 10);

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
      <div className="pagina-encabezado">
        <h1>Alumnos</h1>
        <Link to="/alumnos/nuevo" className="boton">
          Nuevo alumno
        </Link>
      </div>

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
          value={filtros.perfil}
          onChange={(e) => cambiarFiltro("perfil", e.target.value as FiltrosAlumnos["perfil"])}
          aria-label="Perfil"
        >
          <option value="">Todos los perfiles</option>
          {Object.entries(ETIQUETAS_PERFIL).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
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
                <th>DNI</th>
                <th>Edad</th>
                <th>Perfil</th>
                <th>Teléfono</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.visibles.map((alumno) => (
                <tr key={alumno.id}>
                  <td>
                    <Link to={`/alumnos/${alumno.id}`}>
                      {alumno.apellido}, {alumno.nombre}
                    </Link>
                  </td>
                  <td>{alumno.dni}</td>
                  <td>{calcularEdad(alumno.fechaNacimiento)}</td>
                  <td>{ETIQUETAS_PERFIL[alumno.perfil]}</td>
                  <td>{alumno.telefono}</td>
                  <td>
                    <span className={alumno.activo ? "insignia insignia-ok" : "insignia"}>
                      {alumno.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <BotonVerTodos lista={lista} textoCerrar="Ver menos" />
          <p className="texto-suave">
            {alumnos.length} {alumnos.length === 1 ? "alumno" : "alumnos"}
          </p>
        </div>
      )}
    </section>
  );
}
