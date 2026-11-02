# Copias de seguridad

`npm run respaldo` (desde `backend`) guarda una copia de la base con `pg_dump` en la carpeta `respaldos/` (configurable con `RESPALDOS_DIR` en `backend/.env`) y conserva las últimas 30. Con `RESPALDO_CLAVE` (mínimo 16 caracteres) la copia se guarda cifrada como `.dump.cifrado`; en producción es obligatoria. **Sin esa clave la copia no se puede recuperar:** guardarla fuera del servidor. Conviene que esa carpeta esté sincronizada con la nube (por ejemplo, Google Drive para escritorio): una copia en el mismo disco no sirve si la notebook se rompe.

Cada tanto, comprobar que la copia se puede restaurar con `npm run respaldo:probar`: la restaura en una base temporal, cuenta alumnos y pagos, y la borra.

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
pg_restore --clean --no-owner -U postgres -d entrenamiento respaldos\<archivo>.dump
```

`pg_restore` está en `C:\Program Files\PostgreSQL\17\bin`.

Las copias contienen datos personales de los alumnos: no compartirlas. Si se eliminó un alumno, sus datos siguen en las copias anteriores hasta que se reemplacen; restaurar una copia vieja lo trae de vuelta.
