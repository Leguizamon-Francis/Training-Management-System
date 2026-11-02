import { Link } from "react-router";
import { rutinasApi } from "../api/rutinas";
import { useCarga } from "../hooks/useCarga";
import Desplegable from "./Desplegable";
import ListaRutinas from "./ListaRutinas";

// Cantidad de rutinas que se ven en la ficha (el resto, en la pantalla de Rutinas).
const CANTIDAD_EN_FICHA = 4;

// Sección "Rutinas" de la ficha del alumno: sus últimas rutinas guardadas.
export default function RutinasFicha({ alumno }: { alumno: { id: number; nombre: string; telefono: string } }) {
  const alumnoId = alumno.id;
  const { datos: rutinas, error } = useCarga(() => rutinasApi.listar(alumnoId), [alumnoId]);

  return (
    <Desplegable titulo="Rutinas">
      <div className="fila-plan">
        <Link to={`/rutinas/${alumnoId}`} className="boton">
          Nueva rutina
        </Link>
        {rutinas && rutinas.length > CANTIDAD_EN_FICHA && (
          <Link to={`/rutinas/${alumnoId}`} className="link-discreto">
            Ver las {rutinas.length} rutinas →
          </Link>
        )}
      </div>
      {error && <p className="mensaje-error">{error}</p>}
      {rutinas &&
        (rutinas.length === 0 ? (
          <p className="texto-suave">Todavía no tiene rutinas.</p>
        ) : (
          <ListaRutinas rutinas={rutinas.slice(0, CANTIDAD_EN_FICHA)} alumno={alumno} />
        ))}
    </Desplegable>
  );
}
