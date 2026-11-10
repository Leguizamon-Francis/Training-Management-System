import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { authApi } from "../api/auth";
import { ErrorApi } from "../api/cliente";
import Campo from "../componentes/Campo";
import { useEsDemo, useSesion } from "../componentes/Sesion";
import { IconoTema } from "../componentes/Iconos";
import { aplicarTema, leerTema } from "../utils/tema";

type Dato = "nombre" | "email" | "password";

interface PropsFormulario {
  onListo: (mensaje: string) => void;
  onCancelar: () => void;
}

// Lo común de los tres formularios: enviar, mostrar errores y los botones.
function useEnvio() {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  async function enviar(evento: FormEvent<HTMLFormElement>, accion: () => Promise<void>) {
    evento.preventDefault();
    setError("");
    setErrores({});
    setGuardando(true);
    try {
      await accion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el cambio");
      if (err instanceof ErrorApi) setErrores(err.campos);
    } finally {
      setGuardando(false);
    }
  }

  return { guardando, error, errores, setErrores, enviar };
}

function Botones({ guardando, onCancelar }: { guardando: boolean; onCancelar: () => void }) {
  return (
    <div className="acciones acciones-formulario">
      <button type="submit" className="boton" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
      <button type="button" className="boton-secundario" onClick={onCancelar}>
        Cancelar
      </button>
    </div>
  );
}

function FormularioNombre({ onListo, onCancelar }: PropsFormulario) {
  const { usuario, actualizarUsuario } = useSesion();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [actual, setActual] = useState("");
  const { guardando, error, errores, enviar } = useEnvio();

  return (
    <form
      className="formulario-pago"
      noValidate
      onSubmit={(evento) =>
        enviar(evento, async () => {
          actualizarUsuario((await authApi.cambiarNombre(nombre, actual)).usuario);
          onListo("El nombre se cambió.");
        })
      }
    >
      {error && <p className="mensaje-error">{error}</p>}
      <div className="grilla">
        <Campo etiqueta="Nombre de usuario" obligatorio errores={errores.nombre}>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
        </Campo>
        <Campo etiqueta="Contraseña actual" obligatorio errores={errores.actual}>
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" />
        </Campo>
      </div>
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

function FormularioEmail({ onListo, onCancelar }: PropsFormulario) {
  const { usuario, actualizarUsuario } = useSesion();
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [actual, setActual] = useState("");
  const { guardando, error, errores, enviar } = useEnvio();

  return (
    <form
      className="formulario-pago"
      noValidate
      onSubmit={(evento) =>
        enviar(evento, async () => {
          actualizarUsuario((await authApi.cambiarEmail(email, actual)).usuario);
          onListo("El email se cambió. La próxima vez ingresá con el nuevo.");
        })
      }
    >
      {error && <p className="mensaje-error">{error}</p>}
      <div className="grilla">
        <Campo etiqueta="Email nuevo" obligatorio errores={errores.email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Campo>
        <Campo etiqueta="Contraseña actual" obligatorio errores={errores.actual}>
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" />
        </Campo>
      </div>
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

// Las demás sesiones abiertas (ej.: en otra computadora) se cierran al cambiar la contraseña.
function FormularioPassword({ onListo, onCancelar }: PropsFormulario) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repeticion, setRepeticion] = useState("");
  const { guardando, error, errores, setErrores, enviar } = useEnvio();

  return (
    <form
      className="formulario-pago"
      noValidate
      onSubmit={(evento) => {
        if (nueva !== repeticion) {
          evento.preventDefault();
          setErrores({ repeticion: ["Las contraseñas no coinciden"] });
          return;
        }
        enviar(evento, async () => {
          await authApi.cambiarPassword(actual, nueva);
          onListo("La contraseña se cambió. Si había otra sesión abierta, se cerró.");
        });
      }}
    >
      {error && <p className="mensaje-error">{error}</p>}
      <div className="grilla">
        <Campo etiqueta="Contraseña actual" obligatorio errores={errores.actual}>
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" />
        </Campo>
        <Campo etiqueta="Contraseña nueva" obligatorio errores={errores.nueva} ayuda="Al menos 8 caracteres">
          <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" />
        </Campo>
        <Campo etiqueta="Repetir contraseña nueva" obligatorio errores={errores.repeticion}>
          <input type="password" value={repeticion} onChange={(e) => setRepeticion(e.target.value)} autoComplete="new-password" />
        </Campo>
      </div>
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

interface PropsFila {
  etiqueta: string;
  valor: string;
  onCambiar?: () => void;
  textoBoton?: ReactNode;
  ayudaBoton?: string; // para botones que muestran solo un ícono: lo lee el lector de pantalla y aparece al pasar el mouse
  noEnDemo?: boolean; // en la demo el botón se ve pero muestra un aviso (ver Layout)
  children?: ReactNode;
}

function Fila({ etiqueta, valor, onCambiar, textoBoton = "Cambiar", ayudaBoton, noEnDemo, children }: PropsFila) {
  return (
    <div className="fila-configuracion">
      <div className="fila-configuracion-dato">
        <span>
          <span className="texto-suave">{etiqueta}:</span> {valor}
        </span>
        {onCambiar && (
          <button
            type="button"
            className={ayudaBoton ? "boton-secundario boton-icono" : "boton-secundario"}
            onClick={onCambiar}
            aria-label={ayudaBoton}
            title={ayudaBoton}
            data-no-en-demo={noEnDemo || undefined}
          >
            {textoBoton}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// Datos de la cuenta: cada uno se cambia con su propio formulario, que se abre en la misma fila.
export default function Configuracion() {
  const { usuario } = useSesion();
  const esDemo = useEsDemo(); // en la demo el email no se muestra
  const [abierto, setAbierto] = useState<Dato | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [tema, setTema] = useState(leerTema);

  function cambiarTema() {
    const nuevo = tema === "oscuro" ? "claro" : "oscuro";
    aplicarTema(nuevo);
    setTema(nuevo);
  }

  function abrir(dato: Dato) {
    setMensaje("");
    setAbierto(dato);
  }

  const formulario = {
    onListo: (texto: string) => {
      setAbierto(null);
      setMensaje(texto);
    },
    onCancelar: () => setAbierto(null),
  };

  return (
    <section>
      <h1>Configuración</h1>
      {mensaje && <p className="mensaje-ok">{mensaje}</p>}

      <div className="tarjeta seccion">
        <Fila etiqueta="Nombre de usuario" valor={usuario?.nombre ?? ""} noEnDemo onCambiar={abierto === "nombre" ? undefined : () => abrir("nombre")}>
          {abierto === "nombre" && <FormularioNombre {...formulario} />}
        </Fila>
        <Fila etiqueta="Email" valor={esDemo ? "••••••••" : (usuario?.email ?? "")} noEnDemo onCambiar={abierto === "email" ? undefined : () => abrir("email")}>
          {abierto === "email" && <FormularioEmail {...formulario} />}
        </Fila>
        <Fila etiqueta="Contraseña" valor="••••••••" noEnDemo onCambiar={abierto === "password" ? undefined : () => abrir("password")}>
          {abierto === "password" && <FormularioPassword {...formulario} />}
        </Fila>
      </div>

      <div className="tarjeta seccion">
        <Fila
          etiqueta="Modo oscuro"
          valor={tema === "oscuro" ? "Activado" : "Desactivado"}
          onCambiar={cambiarTema}
          textoBoton={<IconoTema />}
          ayudaBoton={tema === "oscuro" ? "Desactivar el modo oscuro" : "Activar el modo oscuro"}
        />
      </div>

      <div className="tarjeta seccion fila-configuracion-dato">
        <span>Perfiles de los alumnos</span>
        <Link to="/configuracion/perfiles" className="boton-secundario">
          Configurar
        </Link>
      </div>

      <div className="tarjeta seccion fila-configuracion-dato">
        <span>Eliminar un alumno y todos sus datos</span>
        <Link to="/configuracion/eliminar-alumno" className="boton-secundario">
          Eliminar alumno
        </Link>
      </div>
    </section>
  );
}
