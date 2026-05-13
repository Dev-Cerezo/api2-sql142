const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const mime = require('mime-types'); // Importa la librería mime-types

/** Node 22+: Readable.from(buffer) puede emitir bytes sueltos; Drive/googleapis espera Buffers. */
function pdfBufferToReadable(buffer) {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const pt = new PassThrough();
  pt.end(b);
  return pt;
}

const dotenv = require('dotenv');
const environment = (process.env.NODE_ENV || 'development').trim();

dotenv.config({
  path: path.join(__dirname, `.env.${environment}`),
});


const credentials = require('./credentials.json');

const oauth2Client = new google.auth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
);

const tokens = {
    access_token: process.env.ACCESS_TOKEN, // Reemplaza con tu token de acceso
    refresh_token: process.env.REFRESH_TOKEN, // Reemplaza con tu token de refresco
    scope: 'https://www.googleapis.com/auth/drive.file',
    token_type: 'Bearer',
    expiry_date: 1234567890123, // Fecha de expiración del token (en milisegundos)
  };

oauth2Client.setCredentials(tokens);

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function createFolder(folderName, parentFolderId) {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: folderName, // Nombre de la carpeta
        mimeType: 'application/vnd.google-apps.folder', // Tipo MIME para carpetas
        parents: parentFolderId ? [parentFolderId] : [], // ID de la carpeta padre (opcional)
      },
    });

    return response.data.id; // Devuelve el ID de la carpeta creada
  } catch (error) {
    console.error('Error al crear la carpeta:', error);
    throw error;
  }
}

async function createFolderext(folderName) {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: 'archivos', // Nombre de la carpeta
        mimeType: 'application/vnd.google-apps.folder', // Tipo MIME para carpetas
        parents: folderName ? [folderName] : [], // ID de la carpeta padre (opcional)
      },
    });

    return response.data.id; // Devuelve el ID de la carpeta creada
  } catch (error) {
    console.error('Error al crear la carpeta:', error);
    throw error;
  }
}


// Función para subir un archivo a Google Drive
// Función para subir un archivo a Google Drive
async function uploadFile(filePath, folderId) {
  try {
    // Obtiene el tipo MIME del archivo - forzar a JPEG
    const mimeType = 'image/jpg'; // Siempre forzar a JPEG

    // Obtener el nombre base del archivo sin extensión
    const originalName = path.basename(filePath);
    const nameWithoutExt = originalName.split('.').slice(0, -1).join('.');
    
    // Crear nuevo nombre con extensión .jpg
    const newFileName = `${nameWithoutExt}.jpg`;

    // Sube el archivo a la carpeta especificada
    const response = await drive.files.create({
      requestBody: {
        name: newFileName, // Nombre del archivo con .jpg
        parents: [folderId], // ID de la carpeta donde se subirá el archivo
      },
      media: {
        mimeType: mimeType, // Tipo MIME forzado a JPEG
        body: fs.createReadStream(filePath), // Lee el archivo desde el sistema de archivos
      },
    });

    console.log('Archivo subido:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al subir el archivo:', error);
    throw error;
  }
}


async function uploadFile2(filePath, folderId) {
  try {
    // 1. DINAMISMO: Obtener el nombre real con su extensión original
    const originalName = path.basename(filePath);

    // 2. DINAMISMO: Detectar el tipo MIME real (pdf, xml, jpg, etc.)
    // Si no lo detecta, usamos 'application/octet-stream' por seguridad
    const detectedMimeType = mime.lookup(filePath) || 'application/octet-stream';

    console.log(`🚀 Subiendo: ${originalName} como ${detectedMimeType}`);

    const response = await drive.files.create({
      requestBody: {
        name: originalName, // Conserva el nombre y extensión real (ej: factura.pdf)
        parents: [folderId],
      },
      media: {
        mimeType: detectedMimeType, // Usa el tipo MIME detectado, no forzado
        body: fs.createReadStream(filePath),
      },
      supportsAllDrives: true,
    });

    console.log('✅ Archivo en Drive:', response.data.name);
    return response.data;
  } catch (error) {
    console.error('❌ Error al subir el archivo:', error);
    throw error;
  }
}

/**
 * Hace el archivo visible con "Cualquiera con el enlace" (lector).
 * Necesario para mostrar la firma en <img src="https://drive.google.com/uc?export=view&id=...">.
 * Si la organización bloquea enlaces públicos, el permiso fallará y solo se registrará en log.
 */
async function makeFilePublicAnyoneRead(fileId) {
  if (!fileId) return;
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: 'anyone',
        role: 'reader',
        allowFileDiscovery: false,
      },
      supportsAllDrives: true,
    });
    console.log('🔓 Permiso público (lector) aplicado al archivo:', fileId);
  } catch (error) {
    const msg = String(error.message || error);
    if (
      msg.includes('already exists') ||
      msg.includes('Duplicate') ||
      error.code === 409
    ) {
      return;
    }
    console.warn('⚠️ No se pudo aplicar permiso público al archivo (p. ej. política Workspace):', fileId, msg);
  }
}

/**
 * Mismo cliente OAuth que uploadFile2 / viáticos — sube PDF desde buffer (requisiciones).
 */
async function uploadPdfBufferToDriveFolder(buffer, fileName, folderId, description) {
  const stream = pdfBufferToReadable(buffer);
  const requestBody = {
    name: fileName,
    parents: [folderId],
  };
  if (description) {
    requestBody.description = String(description).slice(0, 32000);
  }
  const response = await drive.files.create({
    requestBody,
    media: {
      mimeType: 'application/pdf',
      body: stream,
    },
    fields: 'id,name',
    supportsAllDrives: true,
  });
  const id = response.data && response.data.id;
  if (id) {
    console.log('✅ PDF requisición en Drive:', fileName, id);
  }
  return id || null;
}


module.exports = {
  uploadFile,
  createFolder,
  createFolderext,
  uploadFile2,
  makeFilePublicAnyoneRead,
  uploadPdfBufferToDriveFolder,
  /**
   * Descarga contenido UTF-8 de un archivo en Drive (p. ej. JSON maestro).
   * Depende de permisos OAuth/servicio sobre ese fileId (alcance drive.file puede ser limitado).
   */
  async downloadDriveFileAsUtf8(fileId) {
    const id = String(fileId || "").trim();
    if (!id) throw new Error("fileId vacío");
    const res = await drive.files.get(
      { fileId: id, alt: "media" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(res.data).toString("utf8");
  },
};
