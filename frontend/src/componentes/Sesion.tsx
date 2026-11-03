// Usuario logueado, compartido con toda la aplicación.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type Usuario } from "../api/auth";

interface ValorSesion {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  actualizarUsuario: (usuario: Usuario) => void; // después de cambiar sus datos
}

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la página se pregunta a la API si ya hay una sesión (la cookie la manda el navegador).
  useEffect(() => {
    authApi
      .yo()
      .then((respuesta) => setUsuario(respuesta.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  async function iniciarSesion(email: string, password: string) {
    const respuesta = await authApi.login(email, password);
    setUsuario(respuesta.usuario);
  }

  async function cerrarSesion() {
    await authApi.logout();
    setUsuario(null);
  }

  return (
    <ContextoSesion.Provider value={{ usuario, cargando, iniciarSesion, cerrarSesion, actualizarUsuario: setUsuario }}>
      {children}
    </ContextoSesion.Provider>
  );
}

export function useSesion() {
  const valor = useContext(ContextoSesion);
  if (!valor) {
    throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  }
  return valor;
}
