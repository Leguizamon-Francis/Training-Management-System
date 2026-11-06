import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { authApi } from "../api/auth";
import { ErrorApi } from "../api/cliente";
import Campo from "../componentes/Campo";
import MarcaLogin from "../componentes/MarcaLogin";

// Se llega desde el link del mail (/restablecer-password?token=…) para elegir una contraseña nueva.
export default function RestablecerPassword() {
  const token = useSearchParams()[0].get("token") ?? "";
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setErrores({});
    if (nueva !== repetida) {
      setErrores({ repetida: ["Las dos contraseñas no coinciden"] });
      return;
    }
    setEnviando(true);
    try {
      await authApi.restablecerPassword(token, nueva);
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
      if (err instanceof ErrorApi) setErrores(err.campos);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <form className="tarjeta login-formulario" onSubmit={enviar} noValidate>
        <MarcaLogin />
        {listo ? (
          <>
            <p className="mensaje-ok">Listo: tu contraseña se cambió. Por seguridad se cerraron las sesiones abiertas.</p>
            <Link to="/login" className="boton">
              Ingresar
            </Link>
          </>
        ) : !token ? (
          <>
            <p className="mensaje-error">El link está incompleto. Copialo entero desde el mail o pedí uno nuevo.</p>
            <Link to="/olvide-password" className="enlace-login">
              Pedir un link nuevo
            </Link>
          </>
        ) : (
          <>
            <p className="texto-suave">Elegí tu contraseña nueva (mínimo 8 caracteres).</p>
            <Campo etiqueta="Contraseña nueva" errores={errores.nueva}>
              <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" autoFocus />
            </Campo>
            <Campo etiqueta="Repetila" errores={errores.repetida}>
              <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)} autoComplete="new-password" />
            </Campo>
            {error && <p className="mensaje-error">{error}</p>}
            <button type="submit" className="boton" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar contraseña"}
            </button>
            <Link to="/olvide-password" className="enlace-login">
              Pedir un link nuevo
            </Link>
          </>
        )}
      </form>
    </main>
  );
}
