const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types'); // Importa la librería mime-types

const dotenv = require('dotenv');
var environment = process.env.NODE_ENV || 'development'; // Obtiene la variable de entorno NODE_ENV, si no existe, usa 'development' por defecto
if (environment == "test ") {
  environment = "test"
}

const result = dotenv.config({
  path: `.env.${environment}` // Carga el archivo .env.[entorno] (ej: .env.development o .env.test)
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
    });

    console.log('✅ Archivo en Drive:', response.data.name);
    return response.data;
  } catch (error) {
    console.error('❌ Error al subir el archivo:', error);
    throw error;
  }
}

// Función para crear una carpeta en Google Drive
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



module.exports = { uploadFile, createFolder, createFolderext, uploadFile2  };
