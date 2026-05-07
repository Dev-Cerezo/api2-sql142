const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { uploadFile2 } = require("../../googleDriveConfig");

const uploadsDir = path.join(__dirname, "..", "uploads", "requisAdjuntos");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const raw = path.basename(file.originalname || "adjunto");
    const safe = raw.replace(/[^a-zA-Z0-9._\s-]/g, "_").slice(0, 180);
    cb(null, `requis-adj-${Date.now()}-${safe || "archivo"}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname || "") || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    const okExt = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"].indexOf(ext) >= 0;
    const okMime =
      mime.indexOf("pdf") >= 0 ||
      mime.indexOf("image/") === 0;
    if (okExt || okMime) cb(null, true);
    else cb(new Error("Solo se permiten PDF o imágenes (jpg, png, gif, webp)."));
  },
});

function handleMulterUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: "ERROR",
        mensaje: err.message || String(err),
      });
    }
    next();
  });
}

/**
 * POST /api/requisiciones/uploadAdjuntoSolicitud
 * multipart field "file" → misma carpeta REQUIS_DRIVE_FOLDER_ID que PDF autorizado.
 */
async function postUploadAdjuntoSolicitud(req, res) {
  const key = process.env.REQUIS_AUTORIZAR_PROXY_KEY;
  if (key && req.headers["x-requis-autorizar-key"] !== key) {
    return res.status(403).json({
      status: "ERROR",
      mensaje: "Proxy key inválida",
    });
  }
  const folderId = (process.env.REQUIS_DRIVE_FOLDER_ID || "").trim();
  if (!folderId) {
    return res.status(500).json({
      status: "ERROR",
      mensaje: "REQUIS_DRIVE_FOLDER_ID no configurado en el servidor",
    });
  }
  if (!req.file) {
    return res.status(400).json({
      status: "ERROR",
      mensaje: "Falta archivo (campo formulario: file)",
    });
  }
  const filePath = req.file.path;
  try {
    const data = await uploadFile2(filePath, folderId);
    if (!data || !data.id) {
      return res.status(500).json({
        status: "ERROR",
        mensaje: "Drive no devolvió id de archivo",
      });
    }
    return res.json({
      status: "OK",
      id: data.id,
      name: data.name || req.file.originalname,
    });
  } catch (e) {
    console.error("[uploadAdjuntoSolicitud]", e.message || e);
    return res.status(500).json({
      status: "ERROR",
      mensaje: String(e.message || e),
    });
  } finally {
    try {
      fs.unlinkSync(filePath);
    } catch (_e) {
      /* ignore */
    }
  }
}

module.exports = {
  handleMulterUpload,
  postUploadAdjuntoSolicitud,
};
