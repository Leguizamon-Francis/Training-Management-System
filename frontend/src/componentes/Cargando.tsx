// "Cargando…" mientras una pantalla espera sus datos, o el error si falló.
export default function Cargando({ error = "" }: { error?: string }) {
  return error ? <p className="mensaje-error">{error}</p> : <p className="texto-suave">Cargando…</p>;
}
