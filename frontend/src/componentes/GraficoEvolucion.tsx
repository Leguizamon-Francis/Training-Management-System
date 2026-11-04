import type { Lado } from "../api/evaluaciones";
import {
  ETIQUETAS_LADO,
  formatearNumero,
  textoVariacion,
  type DatosGrafico,
  type PuntoGrafico,
} from "../utils/evaluaciones";
import { formatearFecha } from "../utils/formato";

// Gráfico de líneas de la evolución de una prueba, dibujado en SVG (sin librerías).
// - Una escala por gráfico: cada prueba tiene su unidad, por eso hay un gráfico por prueba.
// - Eje X: las evaluaciones en orden (no proporcional al tiempo), rotuladas con su fecha. El n° se ve en el punto.
// - Si la prueba se mide por lado, izquierdo y derecho van juntos para compararlos.
// - Colores fijos por lado (no por orden): izquierdo/sin lado = azul, derecho = naranja.
// - Solo se rotula el último valor; el resto se ve al pasar el mouse sobre cada punto.

const ANCHO = 560;
const ALTO = 236;
const MARGEN = { izquierda: 56, derecha: 72, arriba: 12, abajo: 28 };
const AREA_ANCHO = ANCHO - MARGEN.izquierda - MARGEN.derecha;
const AREA_ALTO = ALTO - MARGEN.arriba - MARGEN.abajo;

// Tamaño de los puntos y del área (invisible) donde el mouse muestra el valor.
const RADIO_PUNTO = 6;
const RADIO_ZONA_MOUSE = 16;

// Cuántas evaluaciones se rotulan como máximo en el eje X (si hay más, se rotula una de cada tantas).
const MAXIMO_ROTULOS_X = 6;

function colorDeLado(lado: Lado | null) {
  return lado === "DER" ? "var(--serie-2)" : "var(--serie-1)";
}

function nombreSerie(lado: Lado | null) {
  return lado ? ETIQUETAS_LADO[lado] : "";
}

// Escala "redonda" para el eje Y: ej. de 28,3 a 33,1 → marcas 28, 30, 32, 34.
function escalaY(minimo: number, maximo: number) {
  if (minimo === maximo) {
    const margen = Math.abs(minimo) * 0.1 || 1;
    minimo -= margen;
    maximo += margen;
  }
  const pasoCrudo = (maximo - minimo) / 4;
  const magnitud = 10 ** Math.floor(Math.log10(pasoCrudo));
  const normalizado = pasoCrudo / magnitud;
  const paso = (normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 2.5 ? 2.5 : normalizado <= 5 ? 5 : 10) * magnitud;
  const inicio = Math.floor(minimo / paso) * paso;
  const fin = Math.ceil(maximo / paso) * paso;
  const marcas: number[] = [];
  for (let valor = inicio; valor <= fin + paso / 2; valor += paso) {
    marcas.push(Number(valor.toFixed(10))); // evita 0.30000000000000004
  }
  return { inicio, fin, marcas };
}

export default function GraficoEvolucion({ datos }: { datos: DatosGrafico }) {
  const { nombre, unidad, series } = datos;

  // Eje X: una posición por evaluación (las de este gráfico), en orden de fecha y n°.
  const porEvaluacion = new Map<number, PuntoGrafico>();
  for (const punto of series.flatMap((s) => s.puntos)) porEvaluacion.set(punto.evaluacionId, punto);
  const evaluaciones = [...porEvaluacion.values()].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero - b.numero);
  const indice = new Map(evaluaciones.map((punto, i) => [punto.evaluacionId, i]));

  const valores = series.flatMap((s) => s.puntos.map((p) => p.valor));
  const y = escalaY(Math.min(...valores), Math.max(...valores));

  const posX = (punto: PuntoGrafico) =>
    evaluaciones.length === 1
      ? MARGEN.izquierda + AREA_ANCHO / 2
      : MARGEN.izquierda + (indice.get(punto.evaluacionId)! / (evaluaciones.length - 1)) * AREA_ANCHO;
  const posY = (valor: number) => MARGEN.arriba + AREA_ALTO - ((valor - y.inicio) / (y.fin - y.inicio)) * AREA_ALTO;

  // Rótulos del eje X: todos si son pocos; si no, uno de cada tantos contando desde el último,
  // que siempre se muestra: así dos rótulos nunca quedan pegados.
  const salto = Math.ceil(evaluaciones.length / MAXIMO_ROTULOS_X);
  const rotulosX = evaluaciones.filter((_, i) => (evaluaciones.length - 1 - i) % salto === 0);

  // Rótulo del último valor de cada serie, separados para que no se encimen.
  const rotulos = series
    .map((serie) => {
      const ultimo = serie.puntos[serie.puntos.length - 1];
      return { lado: serie.lado, x: posX(ultimo), y: posY(ultimo.valor), valor: ultimo.valor };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < rotulos.length; i++) {
    if (rotulos[i].y - rotulos[i - 1].y < 14) rotulos[i].y = rotulos[i - 1].y + 14;
  }

  return (
    <figure className="tarjeta grafico">
      <figcaption>
        <h3>
          {nombre} <span className="texto-suave">({unidad})</span>
        </h3>
        {/* Solo la comparación entre la primera y la última evaluación; el resto se ve en el gráfico. */}
        <dl className="grafico-metricas">
          {series
            .filter((serie) => serie.puntos.length > 1)
            .map((serie) => {
              const primero = serie.puntos[0];
              const ultimo = serie.puntos[serie.puntos.length - 1];
              return (
                <div key={serie.lado ?? "unico"}>
                  <dt>
                    {serie.lado && <span className="muestra-serie" style={{ background: colorDeLado(serie.lado) }} />}
                    {serie.lado ? `${nombreSerie(serie.lado)} — ` : ""}
                    Primer registro → Último: {textoVariacion(primero.valor, ultimo.valor, unidad)}
                  </dt>
                </div>
              );
            })}
        </dl>
      </figcaption>

      <svg
        className="grafico-svg"
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label={`Evolución de ${nombre} en ${unidad}`}
      >
        {/* Grilla y eje Y */}
        {y.marcas.map((marca) => (
          <g key={marca}>
            <line
              className="grafico-grilla"
              x1={MARGEN.izquierda}
              x2={ANCHO - MARGEN.derecha}
              y1={posY(marca)}
              y2={posY(marca)}
            />
            <text className="grafico-eje" x={MARGEN.izquierda - 8} y={posY(marca) + 4} textAnchor="end">
              {formatearNumero(marca)}
            </text>
          </g>
        ))}

        {/* Eje X: fecha de cada evaluación */}
        {rotulosX.map((punto) => (
          <text key={punto.evaluacionId} className="grafico-eje" x={posX(punto)} y={ALTO - 8} textAnchor="middle">
            {formatearFecha(punto.fecha)}
          </text>
        ))}

        {/* Líneas */}
        {series.map((serie) =>
          serie.puntos.length > 1 ? (
            <polyline
              key={serie.lado ?? "unico"}
              className="grafico-linea"
              stroke={colorDeLado(serie.lado)}
              points={serie.puntos.map((p) => `${posX(p)},${posY(p.valor)}`).join(" ")}
            />
          ) : null,
        )}

        {/* Puntos: el círculo grande e invisible es el área para pasar el mouse */}
        {series.map((serie) =>
          serie.puntos.map((punto) => (
            <g key={`${serie.lado ?? "unico"}-${punto.evaluacionId}`}>
              <circle
                className="grafico-punto"
                cx={posX(punto)}
                cy={posY(punto.valor)}
                r={RADIO_PUNTO}
                fill={colorDeLado(serie.lado)}
              />
              <circle className="grafico-zona" cx={posX(punto)} cy={posY(punto.valor)} r={RADIO_ZONA_MOUSE}>
                {/* <title> necesita un único texto: se arma con un template string */}
                <title>
                  {`Evaluación n° ${punto.numero} · ${formatearFecha(punto.fecha)}${serie.lado ? ` · ${nombreSerie(serie.lado)}` : ""}: ${formatearNumero(punto.valor)} ${unidad}`}
                </title>
              </circle>
            </g>
          )),
        )}

        {/* Rótulo del último valor */}
        {rotulos.map((rotulo) => (
          <text key={rotulo.lado ?? "unico"} className="grafico-rotulo" x={rotulo.x + RADIO_PUNTO + 6} y={rotulo.y + 4}>
            {formatearNumero(rotulo.valor)}
          </text>
        ))}
      </svg>

      {series.length > 1 && (
        <div className="grafico-leyenda">
          {series.map((serie) => (
            <span key={serie.lado ?? "unico"}>
              <span className="muestra-serie" style={{ background: colorDeLado(serie.lado) }} />
              {nombreSerie(serie.lado) || "Sin lado"}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}
