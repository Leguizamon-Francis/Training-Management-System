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

  cambiarNombre: (nombre: string) => pedir<{ usuario: Usuario }>("/auth/nombre", { metodo: "PUT", datos: { nombre } }),

  cambiarEmail: (email: string, actual: string) =>
    pedir<{ usuario: Usuario }>("/auth/email", { metodo: "PUT", datos: { email, actual } }),
};
