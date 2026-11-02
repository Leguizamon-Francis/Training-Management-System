import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, las llamadas a /api se reenvían al backend.
    // Así front y back comparten origen: la cookie de sesión funciona sin configurar CORS.
    proxy: {
      "/api": "http://127.0.0.1:3000",
    },
  },
});
