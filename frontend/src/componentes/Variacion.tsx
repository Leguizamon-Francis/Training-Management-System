import { textoVariacion } from "../utils/evaluaciones";
import { Flecha } from "./Iconos";

// Diferencia entre dos mediciones con una flecha hacia arriba o hacia abajo, ej.: (flecha) +2,5 cm (+8,3 %).
// Sin colores: según la prueba, subir puede ser bueno (salto) o malo (tiempo de sprint).
export default function Variacion({ anterior, actual, unidad }: { anterior: number; actual: number; unidad: string }) {
  return (
    <span className="sin-salto">
      {actual !== anterior && <Flecha hacia={actual > anterior ? "arriba" : "abajo"} />}
      {textoVariacion(anterior, actual, unidad)}
    </span>
  );
}
