import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { useSesion } from "../componentes/Sesion";
import { Logo } from "../componentes/Iconos";

export default function Login() {
  const { usuario, iniciarSesion } = useSesion();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión, no tiene sentido mostrar el login.
  if (usuario) {
    return <Navigate to="/" replace />;
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await iniciarSesion(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <form className="tarjeta login-formulario" onSubmit={enviar}>
        <div className="login-marca">
          <Logo />
          <h1>GPE Software</h1>
        </div>
        <p className="texto-suave">Ingresá con tu email y contraseña.</p>

        <label className="campo">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </label>

        <label className="campo">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="mensaje-error">{error}</p>}

        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
