# Copias de seguridad

`npm run respaldo` (desde `backend`) guarda una copia de la base con `pg_dump` en la carpeta `respaldos/` (configurable con `RESPALDOS_DIR` en `backend/.env`) y conserva las últimas 30. Con `RESPALDO_CLAVE` (mínimo 16 caracteres) la copia se guarda cifrada como `.dump.cifrado`; en producción es obligatoria. **Sin esa clave la copia no se puede recuperar:** guardarla fuera del servidor. Conviene que esa carpeta esté sincronizada con la nube (por ejemplo, Google Drive para escritorio): una copia en el mismo disco no sirve si la notebook se rompe.

Cada tanto, comprobar que la copia se puede restaurar con `npm run respaldo:probar`: la restaura en una base temporal, cuenta alumnos y pagos, y la borra.

Con `B2_KEY_ID` y `B2_APPLICATION_KEY`, cada copia se sube además a un bucket de Backblaze B2. En producción es obligatorio.

## Copia automática diaria (Render)

Un Cron Job de Render, en la misma región que la base:

| Campo | Valor |
|---|---|
| Build Command | `npm ci --prefix backend --include=dev` |
| Command | `cd backend && npx tsx src/scripts/respaldo.ts` |
| Schedule | `0 7 * * *` (todos los días a las 4 de Argentina; Render usa hora UTC) |
| Variables | `NODE_ENV=production`, `NODE_VERSION=24`, `DATABASE_URL` (interna), `RESPALDO_CLAVE`, `B2_KEY_ID`, `B2_APPLICATION_KEY` |

El bucket de Backblaze:

- Privado, en una región de la Unión Europea.
- Regla de ciclo de vida: ocultar los archivos a los 30 días y borrarlos un día después. Así quedan unas 30 copias.
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

Si está cifrada, primero descifrarla (deja al lado el `.dump`; borrarlo después de usarlo):

```powershell
npm run respaldo:descifrar -- ..\respaldos\<archivo>.dump.cifrado
```

Sobre la base real (borra lo que haya):

```powershell
pg_restore --clean --no-owner --no-privileges -U postgres -d entrenamiento respaldos\<archivo>.dump
```

`pg_restore` está en `C:\Program Files\PostgreSQL\18\bin` (para las copias de Render hace falta la versión 18; alcanza con instalar las "Command Line Tools"). Es la carpeta que usan los scripts por defecto en Windows.

Las copias contienen datos personales de los alumnos: no compartirlas. Si se eliminó un alumno, sus datos siguen en las copias anteriores hasta que se reemplacen; restaurar una copia vieja lo trae de vuelta.
