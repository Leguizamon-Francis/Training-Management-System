import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { authApi } from "../api/auth";
import MarcaLogin from "../componentes/MarcaLogin";
import { useSesion } from "../componentes/Sesion";

export default function Login() {
  const { usuario, iniciarSesion, entrarDemo } = useSesion();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [demoHabilitada, setDemoHabilitada] = useState(false);

  // El botón "Ver demo" aparece solo si la demo está prendida (DEMO_HABILITADA en el servidor).
  useEffect(() => {
    authApi
      .demoHabilitada()
      .then((respuesta) => setDemoHabilitada(respuesta.habilitada))
      .catch(() => setDemoHabilitada(false));
  }, []);

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

  async function verDemo() {
    setError("");
    setEnviando(true);
    try {
      await entrarDemo();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la demo");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <form className="tarjeta login-formulario" onSubmit={enviar}>
        <MarcaLogin />
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
        <Link to="/olvide-password" className="enlace-login">
          ¿Olvidaste tu contraseña?
        </Link>

        {demoHabilitada && (
          <div className="login-demo">
            <p className="texto-suave">¿Querés conocer el sistema?</p>
            <button type="button" className="boton-secundario" onClick={verDemo} disabled={enviando}>
              Ver demo
            </button>
          </div>
        )}
      </form>
    </main>
  );
}
