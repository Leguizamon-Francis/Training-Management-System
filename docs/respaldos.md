# Copias de seguridad

`npm run respaldo` (desde `backend`) hace **una copia por base** con `pg_dump`: la base de control (gimnasios, usuarios y sesiones) y la de cada gimnasio. Ningún archivo tiene datos de dos gimnasios. Quedan en `respaldos/<base>/` (la carpeta principal se configura con `RESPALDOS_DIR` en `backend/.env`) y en cada carpeta se conservan las últimas 30. Si una base falla, las demás se copian igual y el comando termina con error.

Con `RESPALDO_CLAVE` (mínimo 16 caracteres) cada copia se guarda cifrada como `.dump.cifrado`; en producción es obligatoria. Cada base se cifra con **su propia clave**, que el sistema calcula a partir de `RESPALDO_CLAVE` y del nombre de la base: la copia de un gimnasio no se abre con la clave de otro. **Sin `RESPALDO_CLAVE` ninguna copia se puede recuperar:** guardarla fuera del servidor. Conviene que esa carpeta esté sincronizada con la nube (por ejemplo, Google Drive para escritorio): una copia en el mismo disco no sirve si la notebook se rompe.

Cada tanto, comprobar que las copias se pueden restaurar con `npm run respaldo:probar`: restaura la más nueva de cada base en una base temporal, cuenta los registros (gimnasios y usuarios en la de control; alumnos y pagos en las de los gimnasios) y la borra. Para una sola base: `npm run respaldo:probar -- <base>`.

Con `B2_KEY_ID` y `B2_APPLICATION_KEY`, cada copia se sube además a un bucket de Backblaze B2, en la carpeta de su base (`<base>/<archivo>`). En producción es obligatorio.

## Copia automática diaria (Render)

Un Cron Job de Render, en la misma región que la base:

| Campo | Valor |
|---|---|
| Build Command | `npm ci --prefix backend --include=dev` |
| Command | `cd backend && npx tsx src/scripts/respaldo.ts` |
| Schedule | `0 7 * * *` (todos los días a las 4 de Argentina; Render usa hora UTC) |
| Variables | `NODE_ENV=production`, `NODE_VERSION=24`, `DATABASE_URL` (interna, **de la base de control**), `RESPALDO_CLAVE`, `B2_KEY_ID`, `B2_APPLICATION_KEY` |

El script lee la lista de gimnasios de la base de control con `psql` (viene junto con `pg_dump`): no necesita Prisma ni otro comando de build.

El bucket de Backblaze:

- Privado, en una región de la Unión Europea.
- Regla de ciclo de vida para **todo el bucket** (sin prefijo): ocultar los archivos a los 30 días y borrarlos un día después. Así quedan unas 30 copias de cada base. Si la regla tuviera un prefijo, no alcanzaría a las carpetas de cada base.
- La clave de la aplicación: limitada a ese bucket y de **solo escritura**. Quien tenga acceso al servidor puede subir copias, pero no leerlas ni borrarlas.

Las copias se bajan desde el panel de Backblaze. Las hace `pg_dump` 18 (el que trae Render): para restaurarlas hace falta `pg_restore` 18 o más nuevo.

## Copia automática diaria (Windows)

Para que se haga sola todos los días a las 21 (o apenas se prenda la notebook, si estaba apagada), en PowerShell:

```powershell
$accion = New-ScheduledTaskAction -Execute "cmd.exe" -Argument '/c cd /d "C:\Proyectos\Sistema de gestion de entrenamiento\backend" && npm.cmd run respaldo'
$disparador = New-ScheduledTaskTrigger -Daily -At 21:00
Register-ScheduledTask -TaskName "Respaldo entrenamiento" -Action $accion -Trigger $disparador -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable)
```

## Restaurar una copia

Cada base se restaura sola, sin tocar las demás: si hay que volver atrás los datos de un gimnasio, los otros gimnasios no se enteran.

Si está cifrada, primero descifrarla (deja al lado el `.dump`; borrarlo después de usarlo). **El archivo tiene que estar dentro de la carpeta con el nombre de su base** (`respaldos/<base>/`, igual que en Backblaze): de ese nombre sale su clave. Las copias de antes de que hubiera varios gimnasios (sueltas en `respaldos/`) se descifran con la clave maestra, sin hacer nada especial.

```powershell
npm run respaldo:descifrar -- ..\respaldos\<base>\<archivo>.dump.cifrado
```

Sobre la base de ese gimnasio (borra lo que haya en ella y en ninguna otra):

```powershell
pg_restore --clean --no-owner --no-privileges -U postgres -d <base> respaldos\<base>\<archivo>.dump
```

`pg_restore` está en `C:\Program Files\PostgreSQL\18\bin` (para las copias de Render hace falta la versión 18; alcanza con instalar las "Command Line Tools"). Es la carpeta que usan los scripts por defecto en Windows.

Las copias contienen datos personales de los alumnos: no compartirlas. Si se eliminó un alumno, sus datos siguen en las copias anteriores hasta que se reemplacen; restaurar una copia vieja lo trae de vuelta.
