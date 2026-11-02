import { env } from "./config/env";
import { app } from "./app";

const host = env.HOST ?? (env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

app.listen(env.PORT, host, () => {
  console.log(`Servidor escuchando en http://${host}:${env.PORT}`);
});
