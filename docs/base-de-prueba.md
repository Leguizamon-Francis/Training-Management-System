# Base de prueba

Sirve para probar cambios o grabar una demostración sin usar datos de personas reales: un gimnasio con 14 alumnos inventados, con pagos, evaluaciones, rutinas y asistencias.

## Crearla

Desde `backend`:

1. Copiar `.env.prueba.example` como `.env.prueba` y completar la contraseña de PostgreSQL.
2. Crear la base de control de prueba, el gimnasio y sus datos:

```bash
npm run prueba:preparar
npm run centros:prueba -- crear entrenamiento_prueba "Gimnasio de prueba"
npm run datos-ejemplo -- entrenamiento_prueba
```

## Usarla

```bash
npm run dev:prueba     # el backend con la base de prueba
```

El frontend se abre igual que siempre. El usuario es `demo@dvtraining.test` y la contraseña, `demo-1234`.

`npm run datos-ejemplo` se puede repetir sin duplicar, y se niega a correr en producción o si el nombre de la base no contiene "prueba".

## Pruebas automáticas

`npm test` corre todas las pruebas. Las de aislamiento entre gimnasios (`src/aislamiento.test.ts`) necesitan `.env.prueba`: crean bases descartables en ese servidor, levantan la aplicación y las borran al terminar. Sin `.env.prueba`, esas pruebas se saltean.
