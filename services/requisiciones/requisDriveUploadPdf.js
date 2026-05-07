/**
 * Sube PDF a carpeta de Drive (misma idea que creaDocumento2 → insertaRuta con file Id).
 * Requiere: GOOGLE_APPLICATION_CREDENTIALS (ruta a JSON cuenta de servicio) y
 * REQUIS_DRIVE_FOLDER_ID (carpeta destino, ej. la del script GAS).
 */

async function uploadPdfBufferToDrive(buffer, fileName) {
  const folderId = (process.env.REQUIS_DRIVE_FOLDER_ID || "").trim();
  const keyFile = (process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  if (!folderId || !keyFile) return null;

  const { google } = require("googleapis");
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const client = await auth.getClient();
  const drive = google.drive({ version: "v3", auth: client });

  const { Readable } = require("stream");
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: stream,
    },
    fields: "id",
  });
  return res.data && res.data.id ? res.data.id : null;
}

module.exports = { uploadPdfBufferToDrive };
