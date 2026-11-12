# Publicar el sistema

En producción hay un solo servidor Node: entrega las pantallas y la API desde la misma dirección. En el servidor PostgreSQL hay una base de control (gimnasios, usuarios y sesiones) y una base por gimnasio.

## Qué hace falta contratar

- Un servicio que ejecute Node.js 22.9 o superior, con HTTPS.
- Una base PostgreSQL gestionada, o instalada en el mismo servidor.
- Un dominio (opcional, pero recomendado).
- Un lugar para guardar los respaldos, separado del servidor.

Antes de elegir, revisar en qué país quedan los datos: son datos personales y de salud.

## Variables de entorno

Se cargan en el panel del hosting. **Nunca en el repositorio.**

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | La conexión a la **base de control** (ej.: `.../dv_control`), con un usuario y una contraseña propios y largos. La dirección de cada gimnasio se arma con esta, cambiando solo el nombre de la base |
| `TRUST_PROXY` | `1` si hay un proxy delante, que es lo habitual en un hosting. Sin esto, el límite de intentos de ingreso no funciona bien |
| `RESPALDO_CLAVE` | Mínimo 16 caracteres. Guardarla también fuera del servidor: **sin ella los respaldos no se recuperan** |
| `URL_PUBLICA` | La dirección del sistema, ej.: `https://dvtraining.com.ar`. Arma el link del mail de "¿Olvidaste tu contraseña?" |
| `RESEND_API_KEY` | Clave de Resend para mandar ese mail (solo con permiso de envío). Sin ella o sin `URL_PUBLICA`, la recuperación por email avisa que no está configurada |
| `EMAIL_REMITENTE` | Opcional. Por defecto `DV Training <no-responder@dvtraining.com.ar>`; el dominio tiene que estar verificado en Resend |
| `DEMO_HABILITADA` | Opcional. `false` apaga el botón "Ver demo" y corta las sesiones de la demo |
| `PORT` | Solo si el hosting no la define |

## Comandos

| Paso | Comando |
|---|---|
| Compilar (cada publicación) | `npm run build` |
| Crear la base de control si falta y aplicar los cambios a ella y a cada gimnasio (cada publicación, antes de iniciar) | `npm run migrar` |
| Iniciar | `npm start` |

`npm run build` también genera las planillas de rutina, que no están en el repositorio.

## Sumar un gimnasio

Desde `backend`, en la consola del servidor (en Render, la Shell del Web Service):

```bash
npm run centros -- crear <base> "<Nombre del gimnasio>"   # crea su base con el catálogo inicial
npm run centros -- plantillas <base> [MODELO …]            # le carga modelos de rutina (sin MODELO, los generales)
npm run crear-admin                                        # su usuario de ingreso (pregunta el gimnasio)
```

`<base>` va en minúsculas, sin espacios (ej.: `gimnasio_centro`). Después, el gimnasio entra y define los precios en Membresías → Configurar membresías. `npm run centros -- listar` muestra los gimnasios; `desactivar`, `exportar` y `eliminar` sirven para darlos de baja.

**La demo** es un gimnasio más, de solo lectura: `npm run centros -- copiar <origen> <base> "<nombre>" --demo` crea una copia de los datos de otro gimnasio (que tienen que ser ficticios), y `npm run datos-demo -- <base>` le suma alumnos inventados.

El paso único de "una sola base" a "una base por gimnasio" en el sistema ya publicado está en [varios-gimnasios-render.md](varios-gimnasios-render.md).

## Respaldos automáticos

Programar en el hosting una tarea diaria, desde `backend`, con estas variables además de las anteriores:

- `RESPALDOS_DIR`: la carpeta de las copias.
- `PG_BIN`: la carpeta de los programas de PostgreSQL, si no están en el `PATH`. La versión de `pg_dump` debe ser igual o mayor que la de la base.

```bash
npx tsx src/scripts/respaldo.ts
```

Hace una copia de la base de control y otra de cada gimnasio, cada una cifrada con su propia clave. Con `B2_KEY_ID` y `B2_APPLICATION_KEY` se suben a Backblaze B2, en una carpeta por base: una copia en el mismo lugar no sirve si el servidor falla. En producción el script se niega a correr sin esas variables. Si el hosting ya hace copias de la base, activarlas también. La configuración para Render está en [respaldos.md](respaldos.md).

Una vez por mes, comprobar que se pueden restaurar: ver [respaldos.md](respaldos.md).

## Revisión después de publicar

- [ ] La dirección abre con HTTPS, y por `http://` redirige a `https://`.
- [ ] El ingreso funciona, y cerrar sesión también.
- [ ] Cinco contraseñas incorrectas bloquean el ingreso (si no bloquea, revisar `TRUST_PROXY`).
- [ ] "¿Olvidaste tu contraseña?" manda el mail (revisar spam), el link lleva a `URL_PUBLICA` y permite elegir una contraseña nueva.
- [ ] Se puede crear y descargar una rutina.
- [ ] El respaldo diario corre, y una copia se restauró bien.
- [ ] Probado en un Android y en un iPhone.

## Si se pierde la contraseña

El usuario la recupera solo desde "¿Olvidaste tu contraseña?" en la pantalla de ingreso: recibe un link por mail que vence en 30 minutos y sirve una sola vez. Al elegir la contraseña nueva se cierran todas las sesiones abiertas.

Si el mail no llega (o se perdió el acceso a ese email), desde `backend`, en el servidor, ejecutar `npm run crear-admin` con el mismo email: cambia la contraseña.
