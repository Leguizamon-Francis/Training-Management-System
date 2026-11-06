import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { ErrorHttp } from "../lib/errores";
import { manejarErrores } from "./errores";

// Respuesta falsa que guarda el estado y el cuerpo enviados.
function responder(error: unknown) {
  const respuesta = { estado: 0, cuerpo: undefined as unknown };
  const res = {
    status(estado: number) {
      respuesta.estado = estado;
      return this;
    },
    json(cuerpo: unknown) {
      respuesta.cuerpo = cuerpo;
      return this;
    },
  } as unknown as Response;
  manejarErrores(error, {} as Request, res, () => {});
  return respuesta;
}

const errorPrisma = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("choque", { code, clientVersion: Prisma.prismaVersion.client });

test("ErrorHttp responde con su estado y mensaje", () => {
  assert.deepEqual(responder(new ErrorHttp(404, "No está")), { estado: 404, cuerpo: { error: "No está" } });
});

test("dato repetido en la base (P2002): 409", () => {
  assert.equal(responder(errorPrisma("P2002")).estado, 409);
});

test("dato relacionado que no existe o está en uso (P2003): 409", () => {
  assert.equal(responder(errorPrisma("P2003")).estado, 409);
});

test("otros errores: 500 sin detalles", () => {
  const original = console.error;
  console.error = () => {}; // el error esperado no ensucia la salida de las pruebas
  try {
    assert.deepEqual(responder(new Error("secreto interno")), { estado: 500, cuerpo: { error: "Error interno del servidor" } });
  } finally {
    console.error = original;
  }
});
