# Publicar el sistema

En producción hay un solo servidor Node: entrega las pantallas y la API desde la misma dirección. La base es PostgreSQL.

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
| `DATABASE_URL` | La conexión a la base, con un usuario y una contraseña propios y largos |
| `TRUST_PROXY` | `1` si hay un proxy delante, que es lo habitual en un hosting. Sin esto, el límite de intentos de ingreso no funciona bien |
| `RESPALDO_CLAVE` | Mínimo 16 caracteres. Guardarla también fuera del servidor: **sin ella los respaldos no se recuperan** |
| `PORT` | Solo si el hosting no la define |

## Comandos

| Paso | Comando |
|---|---|
| Compilar (cada publicación) | `npm run build` |
| Aplicar cambios a la base (cada publicación, antes de iniciar) | `npm run migrar` |
| Iniciar | `npm start` |

`npm run build` también genera las planillas de rutina, que no están en el repositorio.

## Primera vez

Una sola vez, desde `backend`, con las variables de entorno cargadas:

```bash
npm run db:seed       # catálogo inicial de pruebas y membresías
npm run crear-admin   # usuario de ingreso
```

Después, entrar y definir los precios en Pagos → Configurar pagos.

La base de producción arranca vacía. **No cargar datos de ejemplo:** el comando se niega en producción.

## Respaldos automáticos

Programar en el hosting una tarea diaria, desde `backend`, con estas variables además de las anteriores:

- `RESPALDOS_DIR`: la carpeta de las copias.
- `PG_BIN`: la carpeta de los programas de PostgreSQL, si no están en el `PATH`. La versión de `pg_dump` debe ser igual o mayor que la de la base.

```bash
npx tsx src/scripts/respaldo.ts
```

Las copias salen cifradas y, con `B2_KEY_ID` y `B2_APPLICATION_KEY`, se suben a Backblaze B2: una copia en el mismo lugar no sirve si el servidor falla. En producción el script se niega a correr sin esas variables. Si el hosting ya hace copias de la base, activarlas también. La configuración para Render está en [respaldos.md](respaldos.md).

Una vez por mes, comprobar que se pueden restaurar: ver [respaldos.md](respaldos.md).

## Revisión después de publicar

- [ ] La dirección abre con HTTPS, y por `http://` redirige a `https://`.
- [ ] El ingreso funciona, y cerrar sesión también.
- [ ] Cinco contraseñas incorrectas bloquean el ingreso (si no bloquea, revisar `TRUST_PROXY`).
- [ ] Se puede crear y descargar una rutina.
- [ ] El respaldo diario corre, y una copia se restauró bien.
- [ ] Probado en un Android y en un iPhone.

## Si se pierde la contraseña

No hay recuperación por email. Desde `backend`, en el servidor, ejecutar `npm run crear-admin` con el mismo email: cambia la contraseña y cierra todas las sesiones.
