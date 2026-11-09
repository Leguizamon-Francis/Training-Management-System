# Pasar a varios gimnasios en Render

Guía para publicar, una sola vez, el cambio a "una base por gimnasio" sobre un sistema que ya está funcionando
con una sola base. Después de esto, cada publicación es como siempre (push a `main`).

**Resultado:** la base actual pasa a ser la del primer gimnasio, se crea la base de control (`dv_control`, con los
gimnasios, usuarios y sesiones) y la demo (`dv_demo`, una copia tomada en ese momento).

**Tiempo:** unos 20 minutos. Entre el paso 5 y el 6 **nadie puede ingresar** (los usuarios todavía no pasaron a la
base de control): hacerlo en un horario en que el sistema no se use.

## 1. Respaldo antes de empezar

Render → Cron Job de respaldos → **Trigger Run**. En **Logs** tiene que decir `Copia subida a Backblaze`.
Si algo sale mal, esta es la copia para volver atrás.

## 2. Anotar el nombre de la base actual

Render → la base de datos (Postgres) → **Connect** → **Internal Database URL**. El nombre de la base es lo que
está después de la última `/`. Por ejemplo, en `postgresql://usuario:clave@dpg-xxxx-a/dv_training_ab12` es
`dv_training_ab12`. En esta guía se llama **`<BASE>`**.

## 3. Cambiar `DATABASE_URL` del Web Service — sin publicar

Web Service → **Environment** → `DATABASE_URL` → editar: reemplazar el final `/<BASE>` por `/dv_control`
(el resto queda igual). Guardar con **Save only** (no "Save and deploy").

> Si se publicó igual por error: avisar antes de seguir. La versión vieja no conoce `dv_control`; hay que borrar
> esa base y volver al paso 3.

## 4. Lo mismo en el Cron Job de respaldos

Cron Job → **Environment** → `DATABASE_URL` → mismo cambio → **Save only**.

## 5. Publicar

Pasar la rama a `main` y hacer push. En el Web Service → **Events**, el paso previo (`npm run migrar`) tiene que
terminar con `Listo: base de control y 0 gimnasios.`

Si falla al crear `dv_control` (el servidor no deja entrar a la base de mantenimiento `postgres`), sigue funcionando
la versión anterior. Crearla desde la **Shell** del Web Service, conectándose a la base actual (la base no acepta
conexiones desde internet, por eso no sirve la consola externa), y volver a publicar (Manual Deploy):

```bash
psql "${DATABASE_URL%/dv_control}/<BASE>" -c 'CREATE DATABASE dv_control'
```

## 6. Registrar el gimnasio y crear la demo

Web Service → **Shell**:

```bash
cd backend
npm run centros -- adoptar <BASE> "<Nombre del gimnasio>"
npm run centros -- copiar <BASE> dv_demo "Usuario Gratuito" --demo
npm run centros -- listar
```

- `adoptar` pasa los usuarios y sesiones de `<BASE>` a la base de control, borra de `<BASE>` las tablas de usuarios
  y le carga las planillas de rutina. Los usuarios entran con la misma contraseña de siempre.
- `copiar` crea `dv_demo` con una copia de los datos de ese momento. Lo que se cargue después en `<BASE>` no pasa a
  la demo.
- `listar` tiene que mostrar los dos gimnasios: el primero con su usuario y "Usuario Gratuito" con `(demo)`.

## 7. Comprobar

- Ingresar con el usuario del gimnasio: tienen que estar todos los alumnos, pagos y rutinas.
- Cerrar sesión → **Ver demo**: franja "Modo demo", y al guardar algo, "Es una demo: no se pueden hacer cambios."

## 8. Respaldos

- Cron Job → **Trigger Run**. En **Logs**: tres copias subidas (`dv_control/…`, `<BASE>/…`, `dv_demo/…`) y
  `Listo: 3 bases copiadas.`
- Backblaze → el bucket → **Lifecycle Settings**: la regla de 30 días tiene que aplicarse a todo el bucket (sin
  "File Name Prefix"); si no, las carpetas nuevas no se borran solas.

## Si algo sale mal

- **Antes del paso 6:** Web Service → **Rollback** al deploy anterior y volver `DATABASE_URL` (Web Service y Cron
  Job) a `/<BASE>`. La base del gimnasio no se tocó.
- **Después del paso 6:** la base del gimnasio ya no tiene las tablas de usuarios, así que la versión anterior no
  puede funcionar con ella. Avisar: se corrige hacia adelante, o se restaura la copia del paso 1.
