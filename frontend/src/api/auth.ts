import { pedir } from "./cliente";

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: "ADMIN";
}

export const authApi = {
  login: (email: string, password: string) =>
    pedir<{ usuario: Usuario }>("/auth/login", { metodo: "POST", datos: { email, password } }),

  logout: () => pedir<void>("/auth/logout", { metodo: "POST" }),

  yo: () => pedir<{ usuario: Usuario }>("/auth/yo"),

  cambiarPassword: (actual: string, nueva: string) =>
    pedir<void>("/auth/password", { metodo: "POST", datos: { actual, nueva } }),

  cambiarNombre: (nombre: string, actual: string) =>
    pedir<{ usuario: Usuario }>("/auth/nombre", { metodo: "PUT", datos: { nombre, actual } }),

  cambiarEmail: (email: string, actual: string) =>
    pedir<{ usuario: Usuario }>("/auth/email", { metodo: "PUT", datos: { email, actual } }),

  // "¿Olvidaste tu contraseña?": manda el link por mail.
  olvidePassword: (email: string) => pedir<{ mensaje: string }>("/auth/olvide-password", { metodo: "POST", datos: { email } }),

  restablecerPassword: (token: string, nueva: string) =>
    pedir<void>("/auth/restablecer-password", { metodo: "POST", datos: { token, nueva } }),
};
