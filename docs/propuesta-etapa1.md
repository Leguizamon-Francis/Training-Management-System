# Etapa 1 – Propuesta de modelo de datos y estructura

> **Documento histórico:** es la propuesta inicial del modelo de datos, acordada con el cliente en octubre de 2026 antes de escribir código. El sistema creció después (asistencias, rutinas sobre PDF, una base de datos por gimnasio); la arquitectura actual está descripta en el [README](../README.md).

## Convenciones del modelo
- IDs `Int` autoincrementales. Todas las tablas con `creadoEn` y `actualizadoEn`.
- Montos `Decimal(12,2)` (los float acumulan errores de redondeo).
- Fechas de calendario como `DATE` sin hora (evita que la zona horaria UTC−3 corra un día). dd/mm/aaaa es solo presentación.

## Entidades

### Usuario y sesión
| Entidad | Campos |
|---|---|
| Usuario | id, email (único), nombre, passwordHash (bcrypt), rol (`ADMIN`) |
| Sesion | id, usuarioId → Usuario, tokenHash (único), expiraEn |

Token aleatorio en cookie httpOnly + SameSite; en la base solo el hash. Logout = borrar la fila (revocación inmediata, sin librería JWT). `rol` prepara el futuro acceso de alumnos.

### Alumnos
| Entidad | Campos |
|---|---|
| Alumno | id, nombre, apellido, dni (único), fechaNacimiento, profesion, telefono, email?, perfil (`DEPORTIVO` \| `SALUD` \| `RECUPERACION`), detallePerfil?, antecedentesDeportivos?, lesiones?, molestias? (en pantalla "Molestias/contracturas"), actividadLaboral?, otrosDatos?, planId? → Plan, activo |
| CambioAlumno | id, alumnoId, campo, valorAnterior, valorNuevo, fecha |

- La edad se calcula, no se guarda.
- Al editar, se registra una fila de `CambioAlumno` por campo modificado, en la misma transacción.
- Sin borrado: baja/reactivación cambia `activo` (y queda en el historial).
- Un único perfil por alumno (`perfil` + `detallePerfil`).
- Ficha del alumno: el profesor ve en una sola pantalla todo lo del alumno (datos, historial de cambios, anotaciones, evaluaciones, cuotas y pagos).

### Anotaciones
| Entidad | Campos |
|---|---|
| Anotacion | id, alumnoId, fecha, tipo (`OBSERVACION` \| `CORRECCION_TECNICA` \| `CAMBIO_EJERCICIO` \| `CARGA` \| `MOLESTIA` \| `OTRO`), detalle, motivo? |

A futuro: `sesionId?` cuando exista el módulo de rutinas.

### Evaluaciones
| Entidad | Campos |
|---|---|
| Prueba (catálogo) | id, nombre (único), categoria (`FUERZA` \| `POTENCIA` \| `VELOCIDAD` \| `MOVILIDAD` \| `RESISTENCIA`), unidad, activa |
| Evaluacion | id, alumnoId, fecha, observaciones? |
| ResultadoEvaluacion | id, evaluacionId, pruebaId → Prueba, valor `Decimal(10,2)`, unidad, lado? (`IZQ` \| `DER`), origen (`PLATAFORMA_FUERZA` \| `MYJUMP` \| `MANUAL`), observacion? |

- Catálogo de pruebas para que las repeticiones sean comparables (seed: IMTP, CMJ, DJ, rangos de movimiento).
- `unidad` es texto con valor por defecto de la prueba (N, cm, s, °, kg), editable.
- `lado` es un agregado propuesto; quitarlo si no sirve.
- Reevaluación pendiente: calculada = última evaluación (o alta) + 2 meses (deportivo y recuperación) / 4 meses (salud). Constantes en código.
- El profesor puede cargar una evaluación cuando lo disponga, en cualquier perfil; la próxima reevaluación se cuenta desde esa última evaluación.

### Planes y pagos
| Entidad | Campos |
|---|---|
| Plan | id, nombre, modalidad (`PRESENCIAL` \| `SEMIPRESENCIAL` \| `ONLINE`), precioMensual, activo |
| Cuota | id, alumnoId, planId, desde, vence, importe (precio al generarla) |
| Pago | id, alumnoId, cuotaId?, fecha, importe, concepto, medio (`EFECTIVO` \| `TRANSFERENCIA`) |

- **(Regla vigente desde el 14-10-2026, reemplaza a la original.)** Las cuotas se encadenan: cada una va de un vencimiento al siguiente (+1 mes, 31/01 → 28/02). La primera cuota de un alumno empieza en la fecha de pago.
- Deuda: mientras el alumno esté **activo**, cada mes sin pagar desde el vencimiento de la última cuota es una cuota adeudada, al precio actual de su plan. Hay que dar de baja a quien deja de venir. Si se reactiva, la deuda cuenta desde la reactivación.
- Al pagar una cuota, cubre el mes más viejo adeudado (o el siguiente, si está al día). La cuota se paga completa (no hay pagos parciales); el importe se propone con el precio del plan y se puede modificar.
- "Anular deuda": si el alumno avisa que no sigue, las cuotas adeudadas se registran como anuladas (`Cuota.anulada`, importe 0) y queda en el historial de cambios; luego se ofrece darlo de baja.
- Vencida: alumno activo cuya última cuota tiene `vence` < hoy. Próxima a vencer: `vence` dentro de 7 días.
- Pago con `cuotaId` vacío = otros conceptos.
- Reporte de ingresos: consulta sobre `Pago` por rango de fechas, totales por medio y por mes.
- WhatsApp: `https://wa.me/549XXXXXXXXXX?text=...` → validar teléfono con código de área, sin 0 ni 15.

### Relaciones
```
Usuario 1─N Sesion
Plan    1─N Alumno (plan actual)        Plan 1─N Cuota
Alumno  1─N CambioAlumno | Anotacion | Evaluacion | Cuota | Pago
Evaluacion 1─N ResultadoEvaluacion N─1 Prueba
Cuota   1─N Pago
```

### Futuro (no implementar)
Ejercicio, Rutina (con versiones), SesionEntrenamiento → Alumno. Turno/Asistencia (con cupos) → Alumno y Plan. Equipo de hockey N–N Alumno. Acceso de alumnos: `Alumno.usuarioId?` + nuevo rol. Integración con dispositivos: ya existe `origen`.

## Estructura de carpetas
```
entrenamiento/
├── README.md
├── .gitignore
├── backend/
│   ├── .env.example
│   ├── prisma/ (schema.prisma, migrations/, seed.ts)
│   └── src/
│       ├── index.ts, app.ts
│       ├── config/       ← env validado con Zod
│       ├── lib/          ← cliente Prisma, fechas
│       ├── middlewares/  ← requiereSesion, validar(schema), errores
│       └── modulos/ auth/ alumnos/ anotaciones/ evaluaciones/ pagos/ panel/
│                    (cada uno: <mod>.routes.ts, <mod>.service.ts, <mod>.schemas.ts)
└── frontend/
    └── src/
        ├── main.tsx, App.tsx
        ├── api/
        ├── paginas/
        ├── componentes/
        └── utils/formato.ts
```
Librerías extra: solo `react-router` (front) y `cookie-parser` (back). CSS plano. Zod no se comparte entre front y back por ahora.

## Decisiones tomadas (13/10/2026)
1. Recuperación/post lesión: reevaluación cada 2 meses (igual que deportivo). En todos los perfiles se puede evaluar cuando el profesor lo disponga.
2. Deuda: ~~solo por pagos parciales; no se acumulan cuotas por meses sin pagar~~. **Cambiado el 14-10-2026:** se acumulan las cuotas sin pagar mientras el alumno esté activo, con opción de "Anular deuda" (ver Planes y pagos).
3. Un único perfil por alumno, con ficha completa accesible.
4. Proyecto en `C:\Proyectos\Sistema de gestion de entrenamiento` (fuera de OneDrive). Base de datos: PostgreSQL nativo (instalador EDB), sin Docker.
5. Quitados: tipo de anotación `MATERIAL` y origen `CINTA_METRICA`.

## Preguntas abiertas (historial, ya respondidas)
1. ¿Intervalo de reevaluación para perfil recuperación/post lesión? (Opción: valor por defecto según perfil, ajustable por alumno.)
2. ¿Está bien que la deuda nazca solo de pagos parciales? (Si pasan dos meses sin pagar no se acumulan cuotas; al volver a pagar arranca un período nuevo.)
3. ¿Un alumno tiene un único perfil? (Propuesto: perfil principal + texto de detalle.)
4. ¿Docker Desktop o PostgreSQL nativo? ¿Se movió la carpeta fuera de OneDrive?
