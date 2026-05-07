/**
 * Sube el PDF de requisición a Google Drive y devuelve el file id (insertaRuta).
 *
 * Por defecto usa el MISMO cliente que viáticos: api2-sql142/googleDriveConfig.js
 * (credentials.json en la raíz de api2-sql142 + ACCESS_TOKEN + REFRESH_TOKEN del .env).
 * No busca el proyecto hermano api-sql142.
 *
 * REQUIS_DRIVE_AUTH:
 * - auto (defecto): OAuth viáticos si hay tokens; si falla y hay cuenta de servicio, reintenta.
 * - oauth: solo OAuth (googleDriveConfig).
 * - service_account: solo GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Carpeta: REQUIS_DRIVE_FOLDER_ID — debe estar en el Drive del usuario de los tokens o
 * compartida con él como Editor (igual que las carpetas de viáticos).
 */

const path = require("path");
const { PassThrough } = require("stream");

function pdfBufferToReadable(buffer) {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const pt = new PassThrough();
  pt.end(b);
  return pt;
}

function buildPdfDriveDescription(meta) {
  const m = meta || {};
  const lines = [
    "Requisición de compra — PDF generado al autorizar (api2-sql142).",
  ];
  if (m.idRequisicion) {
    lines.push("ID requisición: " + String(m.idRequisicion));
  }
  if (m.creadoPorNombre || m.creadoPorEmail) {
    const mail = m.creadoPorEmail ? " <" + m.creadoPorEmail + ">" : "";
    lines.push(
      "Autorizó (generó este PDF): " +
        String(m.creadoPorNombre || "").trim() +
        mail
    );
  }
  if (m.nombreSolicitante) {
    lines.push("Solicitó: " + String(m.nombreSolicitante).trim());
  }
  lines.push("Registro UTC: " + new Date().toISOString());
  return lines.join("\n");
}

/** Mismos tokens que carga googleDriveConfig para viáticos. */
function viaticosOAuthTokensPresent() {
  const access = (process.env.ACCESS_TOKEN || "").trim();
  const refresh = (process.env.REFRESH_TOKEN || "").trim();
  return Boolean(access && refresh);
}

function serviceAccountConfigured() {
  const folderId = (process.env.REQUIS_DRIVE_FOLDER_ID || "").trim();
  const keyFile = (process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  return Boolean(folderId && keyFile);
}

async function uploadPdfBufferWithGoogleDriveConfig(
  buffer,
  fileName,
  folderId,
  description
) {
  const gdc = require(path.join(__dirname, "..", "..", "googleDriveConfig"));
  if (typeof gdc.uploadPdfBufferToDriveFolder !== "function") {
    throw new Error("googleDriveConfig sin uploadPdfBufferToDriveFolder");
  }
  return gdc.uploadPdfBufferToDriveFolder(
    buffer,
    fileName,
    folderId,
    description
  );
}

async function filesCreatePdfServiceAccount(drive, params) {
  const { buffer, fileName, folderId, description } = params;
  const stream = pdfBufferToReadable(buffer);
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      description: description || undefined,
    },
    media: {
      mimeType: "application/pdf",
      body: stream,
    },
    fields: "id,name",
    supportsAllDrives: true,
  });
  return res.data && res.data.id ? res.data.id : null;
}

async function uploadPdfBufferWithServiceAccount(
  buffer,
  fileName,
  folderId,
  description
) {
  const keyFile = (process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  const useFullDriveScope =
    String(process.env.REQUIS_DRIVE_SCOPE || "").trim().toLowerCase() ===
    "drive";
  const scope = useFullDriveScope
    ? "https://www.googleapis.com/auth/drive"
    : "https://www.googleapis.com/auth/drive.file";

  const { google } = require("googleapis");
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: [scope],
  });
  const client = await auth.getClient();
  const drive = google.drive({ version: "v3", auth: client });
  return filesCreatePdfServiceAccount(drive, {
    buffer,
    fileName,
    folderId,
    description,
  });
}

/**
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {object} [meta]
 * @param {string} [meta.idRequisicion]
 * @param {string} [meta.creadoPorNombre]
 * @param {string} [meta.creadoPorEmail]
 * @param {string} [meta.nombreSolicitante]
 */
async function uploadPdfBufferToDrive(buffer, fileName, meta) {
  const folderId = (process.env.REQUIS_DRIVE_FOLDER_ID || "").trim();
  if (!folderId) {
    console.warn(
      "[requisDriveUploadPdf] Define REQUIS_DRIVE_FOLDER_ID (id de la carpeta en Drive)."
    );
    return null;
  }

  const mode = String(process.env.REQUIS_DRIVE_AUTH || "auto")
    .trim()
    .toLowerCase();
  const description = buildPdfDriveDescription(meta);

  const tryOAuth =
    mode === "oauth" ||
    (mode === "auto" && viaticosOAuthTokensPresent());
  const trySaExplicit = mode === "service_account";

  if (mode === "oauth" && !viaticosOAuthTokensPresent()) {
    console.warn(
      "[requisDriveUploadPdf] REQUIS_DRIVE_AUTH=oauth: faltan ACCESS_TOKEN o REFRESH_TOKEN en el .env del servidor api2-sql142."
    );
    return null;
  }

  if (tryOAuth) {
    try {
      const id = await uploadPdfBufferWithGoogleDriveConfig(
        buffer,
        fileName,
        folderId,
        description
      );
      if (!id) {
        console.error("[requisDriveUploadPdf] OAuth (googleDriveConfig): sin id");
      } else {
        console.log(
          "[requisDriveUploadPdf] Subido con el mismo OAuth que viáticos, id:",
          id
        );
      }
      return id;
    } catch (e) {
      const gErr =
        e &&
        e.response &&
        e.response.data &&
        typeof e.response.data === "object"
          ? JSON.stringify(e.response.data)
          : "";
      console.error(
        "[requisDriveUploadPdf] Error Drive (googleDriveConfig / viáticos):",
        gErr || e.message || e
      );
      if (mode === "auto" && serviceAccountConfigured()) {
        console.warn(
          "[requisDriveUploadPdf] Reintentando con cuenta de servicio…"
        );
        try {
          return await uploadPdfBufferWithServiceAccount(
            buffer,
            fileName,
            folderId,
            description
          );
        } catch (e2) {
          console.error(
            "[requisDriveUploadPdf] Error Google Drive (service account):",
            e2.message || e2
          );
          throw e2;
        }
      }
      throw e;
    }
  }

  if (!trySaExplicit && !serviceAccountConfigured()) {
    console.warn(
      "[requisDriveUploadPdf] Sin tokens OAuth (ACCESS_TOKEN/REFRESH_TOKEN) ni cuenta de servicio. Viáticos usa el .env y credentials.json en la raíz de api2-sql142."
    );
    return null;
  }

  if (!serviceAccountConfigured()) {
    console.warn(
      "[requisDriveUploadPdf] Falta GOOGLE_APPLICATION_CREDENTIALS o carpeta."
    );
    return null;
  }

  try {
    const id = await uploadPdfBufferWithServiceAccount(
      buffer,
      fileName,
      folderId,
      description
    );
    if (!id) {
      console.error("[requisDriveUploadPdf] Drive (SA) respondió sin id");
    }
    return id;
  } catch (e) {
    const gErr =
      e &&
      e.response &&
      e.response.data &&
      typeof e.response.data === "object"
        ? JSON.stringify(e.response.data)
        : "";
    console.error(
      "[requisDriveUploadPdf] Error Google Drive (service account):",
      gErr || e.message || e
    );
    throw e;
  }
}

module.exports = { uploadPdfBufferToDrive, buildPdfDriveDescription };
