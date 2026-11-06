import { Logo } from "./Iconos";

// Logo y nombre arriba de las pantallas sin sesión: ingresar y recuperar la contraseña.
export default function MarcaLogin() {
  return (
    <div className="login-marca">
      <Logo />
      <div>
        <h1>DV Training</h1>
        <p className="texto-suave">Gestión de entrenamiento</p>
      </div>
    </div>
  );
}
