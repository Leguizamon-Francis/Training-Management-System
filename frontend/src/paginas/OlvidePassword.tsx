import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { authApi } from "../api/auth";
import MarcaLogin from "../componentes/MarcaLogin";
import { Flecha } from "../componentes/Iconos";

// "¿Olvidaste tu contraseña?": se pide el email y el sistema manda un link para elegir una nueva.
// La respuesta es la misma exista o no el email (no se revela quién tiene cuenta).
export default function OlvidePassword() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      setMensaje((await authApi.olvidePassword(email)).mensaje);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el link");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <form className="tarjeta login-formulario" onSubmit={enviar}>
        <MarcaLogin />
        {mensaje ? (
          <>
            <p className="mensaje-ok">{mensaje}</p>
            <p className="texto-suave">Revisá también la carpeta de spam. El link vence en 30 minutos.</p>
          </>
        ) : (
          <>
            <p className="texto-suave">Escribí tu email y te mandamos un link para elegir una contraseña nueva.</p>
            <label className="campo">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
            </label>
            {error && <p className="mensaje-error">{error}</p>}
            <button type="submit" className="boton" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar link"}
            </button>
          </>
        )}
        <Link to="/login" className="enlace-login">
          <Flecha hacia="atras" />
          Volver a ingresar
        </Link>
      </form>
    </main>
  );
}
