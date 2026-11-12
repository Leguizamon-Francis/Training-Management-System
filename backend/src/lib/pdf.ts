import type { Response } from "express";

// Envía un PDF. Con nombre de archivo, el navegador lo descarga; sin nombre, lo muestra.
export function enviarPdf(res: Response, bytes: Uint8Array, nombreArchivo?: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", "no-store"); // contiene datos personales
  if (nombreArchivo) {
    // filename* admite tildes; filename es el respaldo sin caracteres especiales.
    const simple = nombreArchivo.normalize("NFD").replace(/[^\x20-\x7E]/g, "");
    res.setHeader("Content-Disposition", `attachment; filename="${simple}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`);
  }
  res.send(Buffer.from(bytes));
}
