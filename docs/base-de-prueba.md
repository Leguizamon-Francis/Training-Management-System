# Base de prueba

Sirve para probar cambios o grabar una demostración sin usar datos de personas reales. Tiene 12 alumnos inventados con pagos, evaluaciones, rutinas y asistencias.

## Crearla

Desde `backend`:

1. Copiar `.env.prueba.example` como `.env.prueba` y completar la contraseña de PostgreSQL.
2. Crear la base `entrenamiento_prueba` (`createdb -U postgres entrenamiento_prueba`).
3. Aplicar la estructura y cargar los datos:

```bash
npm run prueba:preparar
npm run datos-ejemplo
```

## Usarla

```bash
npm run dev:prueba     # el backend con la base de prueba
```

El frontend se abre igual que siempre. El usuario es `demo@gpe.test` y la contraseña, `demo-1234`.

`npm run datos-ejemplo` se puede repetir sin duplicar, y se niega a correr en producción o si el nombre de la base no contiene "prueba".
