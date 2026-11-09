// Pruebas de aislamiento entre gimnasios: un usuario de un gimnasio nunca ve ni toca nada de otro.
//
// Arma sus propias bases descartables en el servidor de .env.prueba (una de control y dos gimnasios),
// levanta el sistema de verdad y le pega por HTTP como lo haría alguien del otro gimnasio. Al terminar las borra.
// Sin .env.prueba (o fuera de un servidor de prueba) se saltea. Se corre con npm test.
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, test } from "node:test";

const BASE_CONTROL = "prueba_aislamiento_control";
const BASES = { A: "prueba_aislamiento_a", B: "prueba_aislamiento_b" } as const;
const BASE_DEMO = "prueba_aislamiento_demo";
type Gimnasio = keyof typeof BASES;

// Cada gimnasio carga datos con una marca propia: si la marca del otro aparece en una respuesta, hay una fuga.
const MARCA = { A: "SECRETO-A", B: "SECRETO-B" } as const;
const PASSWORD = "clave-aislamiento";

const urlOriginal = process.env.DATABASE_URL ?? "";
const servidorDePrueba = process.env.NODE_ENV !== "production" && new URL(urlOriginal || "x:/").pathname.includes("prueba");

describe("aislamiento entre gimnasios", { skip: !servidorDePrueba && "hace falta .env.prueba (servidor de prueba)" }, () => {
  let servidor: Server;
  let direccion = "";
  const cookies: Record<Gimnasio, string> = { A: "", B: "" };
  // Herramientas que se importan recién después de apuntar DATABASE_URL a la base de control descartable.
  let herramientas: typeof import("./scripts/herramientas-centros");
  let centros: typeof import("./lib/centros");
  let control: typeof import("./lib/control").control;

  async function pedir(gimnasio: Gimnasio | null, metodo: string, ruta: string, datos?: unknown) {
    const respuesta = await fetch(`${direccion}/api${ruta}`, {
      method: metodo,
      headers: { "content-type": "application/json", ...(gimnasio ? { cookie: cookies[gimnasio] } : {}) },
      body: datos === undefined ? undefined : JSON.stringify(datos),
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, texto, json: texto ? JSON.parse(texto) : null };
  }

  async function borrarBases() {
    const { PrismaClient } = await import("@prisma/client");
    const mantenimiento = new PrismaClient({ datasourceUrl: centros.urlDeBase("postgres") });
    for (const base of [BASE_CONTROL, BASES.A, BASES.B, BASE_DEMO]) {
      await mantenimiento.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${base}" WITH (FORCE)`);
    }
    await mantenimiento.$disconnect();
  }

  before(async () => {
    // Desde acá, la "base de control" del sistema es la descartable (mismo servidor que .env.prueba).
    const url = new URL(urlOriginal);
    url.pathname = `/${BASE_CONTROL}`;
    process.env.DATABASE_URL = url.toString();

    centros = await import("./lib/centros");
    herramientas = await import("./scripts/herramientas-centros");
    await borrarBases(); // por si quedaron de una corrida cortada

    await herramientas.asegurarBase(BASE_CONTROL);
    herramientas.migrarControl();
    control = (await import("./lib/control")).control;
    const { hashearPassword } = await import("./modulos/auth/auth.service");
    const passwordHash = await hashearPassword(PASSWORD);

    for (const gimnasio of ["A", "B"] as const) {
      await herramientas.asegurarBase(BASES[gimnasio]);
      herramientas.migrarCentro(BASES[gimnasio]);
      const centro = await control.centro.create({ data: { nombre: `Gimnasio ${gimnasio}`, baseDatos: BASES[gimnasio] } });
      await control.usuario.create({ data: { email: `${gimnasio.toLowerCase()}@aislamiento.test`, nombre: gimnasio, passwordHash, centroId: centro.id } });
    }

    // Gimnasio de la demo: solo lectura, con su usuario DEMO (sin contraseña conocida).
    await herramientas.asegurarBase(BASE_DEMO);
    herramientas.migrarCentro(BASE_DEMO);
    const demo = await control.centro.create({ data: { nombre: "Demo", baseDatos: BASE_DEMO, esDemo: true } });
    await control.usuario.create({ data: { email: "demo@aislamiento.test", nombre: "Visitante", rol: "DEMO", passwordHash, centroId: demo.id } });

    const { app } = await import("./app");
    servidor = app.listen(0, "127.0.0.1");
    await new Promise((listo) => servidor.once("listening", listo));
    direccion = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;

    for (const gimnasio of ["A", "B"] as const) {
      const respuesta = await fetch(`${direccion}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: `${gimnasio.toLowerCase()}@aislamiento.test`, password: PASSWORD }),
      });
      assert.equal(respuesta.status, 200);
      cookies[gimnasio] = respuesta.headers.get("set-cookie")!.split(";")[0];
    }

    // A tiene dos alumnos (ids 1 y 2) y B uno (id 1): el 2 existe solo en A.
    const perfilA = (await pedir("A", "GET", "/perfiles")).json[0].id;
    const perfilB = (await pedir("B", "GET", "/perfiles")).json[0].id;
    const alumno = (marca: string, dni: string, perfilId: number) => ({
      nombre: marca, apellido: marca, dni, fechaNacimiento: "1990-01-01", telefono: "3411234567", perfilId,
    });
    assert.equal((await pedir("A", "POST", "/alumnos", alumno(MARCA.A, "99100001", perfilA))).estado, 201);
    assert.equal((await pedir("A", "POST", "/alumnos", alumno(MARCA.A, "99100002", perfilA))).estado, 201);
    assert.equal((await pedir("B", "POST", "/alumnos", alumno(MARCA.B, "99200001", perfilB))).estado, 201);

    const anotacion = { fecha: "2026-01-10", tipo: "OBSERVACION", detalle: MARCA.A };
    assert.equal((await pedir("A", "POST", "/alumnos/2/anotaciones", anotacion)).estado, 201);
    assert.equal((await pedir("A", "POST", "/pruebas", { nombre: MARCA.A, categoria: "FUERZA", unidad: "kg" })).estado, 201);
    assert.equal((await pedir("A", "POST", "/perfiles", { nombre: MARCA.A, mesesReevaluacion: 3, password: PASSWORD })).estado, 201);
  });

  after(async () => {
    servidor?.closeAllConnections(); // sin esto, las conexiones keep-alive de fetch dejan el proceso abierto
    servidor?.close();
    await control?.$disconnect();
    await centros?.desconectarCentros();
    if (centros) await borrarBases();
  });

  test("sin sesión no se ve nada de ningún gimnasio", async () => {
    for (const ruta of ["/alumnos", "/alumnos/1", "/perfiles", "/pruebas", "/planes", "/panel", "/pagos/estado-cuotas", "/pagos/ultimos", "/rutinas/alumnos", "/asistencias/dia", "/evaluaciones/resumen-alumnos"]) {
      assert.equal((await pedir(null, "GET", ruta)).estado, 401, ruta);
    }
  });

  test("cada gimnasio lista solo lo suyo", async () => {
    const rutas = ["/alumnos?estado=todos", "/alumnos/1", "/alumnos/1/historial", "/perfiles", "/pruebas", "/panel", "/pagos/estado-cuotas", "/evaluaciones/resumen-alumnos", "/rutinas/alumnos", "/asistencias/resumen?mes=2026-01"];
    for (const ruta of rutas) {
      const deB = await pedir("B", "GET", ruta);
      assert.equal(deB.estado, 200, ruta);
      assert.ok(!deB.texto.includes(MARCA.A), `B vio datos de A en ${ruta}`);
      const deA = await pedir("A", "GET", ruta);
      assert.ok(!deA.texto.includes(MARCA.B), `A vio datos de B en ${ruta}`);
    }
    assert.equal((await pedir("A", "GET", "/alumnos?estado=todos")).json.length, 2);
    assert.equal((await pedir("B", "GET", "/alumnos?estado=todos")).json.length, 1);
  });

  test("el mismo número de alumno es otra persona en cada gimnasio, y lo que es de otro no existe", async () => {
    assert.equal((await pedir("A", "GET", "/alumnos/1")).json.nombre, MARCA.A);
    assert.equal((await pedir("B", "GET", "/alumnos/1")).json.nombre, MARCA.B);
    assert.equal((await pedir("B", "GET", "/alumnos/2")).estado, 404);
    const anotaciones = await pedir("B", "GET", "/alumnos/2/anotaciones");
    assert.ok(!anotaciones.texto.includes(MARCA.A));
    assert.equal((await pedir("B", "GET", "/alumnos?estado=todos&buscar=99100001")).json.length, 0);
  });

  test("no se puede modificar ni borrar lo de otro gimnasio", async () => {
    const cambio = { nombre: "PISADO", apellido: "PISADO", dni: "99100002", fechaNacimiento: "1990-01-01", telefono: "3411234567", perfilId: 1 };
    assert.equal((await pedir("B", "PUT", "/alumnos/2", cambio)).estado, 404);
    assert.equal((await pedir("B", "DELETE", "/anotaciones/1")).estado, 404);
    assert.equal((await pedir("B", "PATCH", "/alumnos/2/estado", { activo: false })).estado, 404);

    const alumnoA = (await pedir("A", "GET", "/alumnos/2")).json;
    assert.equal(alumnoA.nombre, MARCA.A);
    assert.equal(alumnoA.activo, true);
    assert.equal((await pedir("A", "GET", "/alumnos/2/anotaciones")).json.length, 1);
  });

  test("con muchos pedidos al mismo tiempo no se cruzan las bases", async () => {
    const resultados = await Promise.all(
      Array.from({ length: 200 }, (_, i) => {
        const gimnasio: Gimnasio = i % 2 === 0 ? "A" : "B";
        return pedir(gimnasio, "GET", "/alumnos/1").then((r) => r.json.nombre === MARCA[gimnasio]);
      }),
    );
    assert.equal(resultados.filter((bien) => !bien).length, 0);
  });

  test("un gimnasio desactivado no puede entrar, ni con una sesión ya abierta", async () => {
    await control.centro.update({ where: { baseDatos: BASES.B }, data: { activo: false } });
    try {
      assert.equal((await pedir("B", "GET", "/alumnos")).estado, 401);
      const login = await pedir(null, "POST", "/auth/login", { email: "b@aislamiento.test", password: PASSWORD });
      assert.equal(login.estado, 401);
    } finally {
      await control.centro.update({ where: { baseDatos: BASES.B }, data: { activo: true } });
    }
  });

  test("consultar sin un gimnasio identificado da error en vez de elegir una base", async () => {
    const { prisma } = await import("./lib/prisma");
    await assert.rejects(async () => prisma.alumno.count(), /sin un gimnasio identificado/);
  });

  test("los nombres de base raros se rechazan (no se pueden inyectar en la conexión ni en CREATE DATABASE)", () => {
    for (const nombre of ['x"; DROP DATABASE y; --', "../otra", "Mayusculas", "con espacio", "", "1empieza_con_numero"]) {
      assert.throws(() => centros.urlDeBase(nombre), /inválido/, nombre);
    }
  });

  describe("demo", () => {
    let cookieDemo = "";

    before(async () => {
      const respuesta = await fetch(`${direccion}/api/auth/demo`, { method: "POST" });
      assert.equal(respuesta.status, 200);
      cookieDemo = respuesta.headers.get("set-cookie")!.split(";")[0];
    });

    async function pedirDemo(metodo: string, ruta: string, datos?: unknown) {
      const respuesta = await fetch(`${direccion}/api${ruta}`, {
        method: metodo,
        headers: { "content-type": "application/json", cookie: cookieDemo },
        body: datos === undefined ? undefined : JSON.stringify(datos),
      });
      const texto = await respuesta.text();
      return { estado: respuesta.status, texto };
    }

    test("entra con el botón, consulta su propio gimnasio y no ve nada de los otros", async () => {
      assert.equal((await pedir(null, "GET", "/auth/demo")).json.habilitada, true);
      const yo = JSON.parse((await pedirDemo("GET", "/auth/yo")).texto);
      assert.equal(yo.usuario.rol, "DEMO");
      assert.equal(yo.usuario.centro.esDemo, true);
      for (const ruta of ["/alumnos?estado=todos", "/perfiles", "/pruebas", "/panel", "/pagos/estado-cuotas"]) {
        const respuesta = await pedirDemo("GET", ruta);
        assert.equal(respuesta.estado, 200, ruta);
        assert.ok(!respuesta.texto.includes(MARCA.A) && !respuesta.texto.includes(MARCA.B), `la demo vio otro gimnasio en ${ruta}`);
      }
    });

    test("no puede crear, modificar ni borrar nada", async () => {
      const intentos: [string, string, unknown][] = [
        ["POST", "/alumnos", { nombre: "X", apellido: "X", dni: "99300001", fechaNacimiento: "1990-01-01", telefono: "3411234567", perfilId: 1 }],
        ["PUT", "/alumnos/1", {}],
        ["PATCH", "/alumnos/1/estado", { activo: false }],
        ["POST", "/alumnos/1/eliminar", { password: "x" }],
        ["POST", "/alumnos/1/anotaciones", {}],
        ["DELETE", "/anotaciones/1", undefined],
        ["POST", "/alumnos/1/pagos", {}],
        ["PUT", "/planes/1", { precioMensual: "1" }],
        ["POST", "/perfiles", { nombre: "X", mesesReevaluacion: 2, password: "x" }],
        ["PUT", "/alumnos/1/asistencias/2026-01-10", undefined],
        ["POST", "/rutinas?tipo=MODELO_RUTINA", undefined],
        ["POST", "/auth/password", { actual: "x", nueva: "otra-clave-larga" }],
        ["PUT", "/auth/nombre", { nombre: "X", actual: "x" }],
        ["PUT", "/auth/email", { email: "x@x.test", actual: "x" }],
      ];
      for (const [metodo, ruta, datos] of intentos) {
        const respuesta = await pedirDemo(metodo, ruta, datos);
        assert.equal(respuesta.estado, 403, `${metodo} ${ruta}`);
        assert.match(respuesta.texto, /Es una demo/);
      }
    });

    test("no puede descargar planillas", async () => {
      assert.equal((await pedirDemo("GET", "/rutinas/1/pdf?descargar=true")).estado, 403);
    });

    test("el usuario de la demo no entra con contraseña", async () => {
      const login = await pedir(null, "POST", "/auth/login", { email: "demo@aislamiento.test", password: PASSWORD });
      assert.equal(login.estado, 401);
    });
  });
});
