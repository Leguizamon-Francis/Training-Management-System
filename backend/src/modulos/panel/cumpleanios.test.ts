import assert from "node:assert/strict";
import { test } from "node:test";
import { cumpleEnSemana, semanaDe } from "./panel.service";

test("semana de lunes a domingo", () => {
  assert.deepEqual(semanaDe("2026-11-10"), { lunes: "2026-11-09", domingo: "2026-11-15" }); // martes
  assert.deepEqual(semanaDe("2026-11-09"), { lunes: "2026-11-09", domingo: "2026-11-15" }); // lunes
  assert.deepEqual(semanaDe("2026-11-15"), { lunes: "2026-11-09", domingo: "2026-11-15" }); // domingo
});

test("cumpleaños dentro y fuera de la semana, con la edad que cumple", () => {
  const semana = semanaDe("2026-11-10");
  assert.deepEqual(cumpleEnSemana("2000-11-12", semana), { fecha: "2026-11-12", edad: 26 });
  assert.deepEqual(cumpleEnSemana("1990-11-09", semana), { fecha: "2026-11-09", edad: 36 });
  assert.equal(cumpleEnSemana("2000-11-16", semana), null);
  assert.equal(cumpleEnSemana("2000-11-08", semana), null);
});

test("semana entre dos años y 29 de febrero", () => {
  const finDeAnio = semanaDe("2026-12-30"); // del lunes 28-12-2026 al domingo 03-01-2027
  assert.deepEqual(cumpleEnSemana("2001-01-02", finDeAnio), { fecha: "2027-01-02", edad: 26 });
  assert.deepEqual(cumpleEnSemana("2001-12-29", finDeAnio), { fecha: "2026-12-29", edad: 25 });
  assert.deepEqual(cumpleEnSemana("2004-02-29", semanaDe("2027-02-25")), { fecha: "2027-02-28", edad: 23 });
  assert.deepEqual(cumpleEnSemana("2004-02-29", semanaDe("2028-02-29")), { fecha: "2028-02-29", edad: 24 });
});
