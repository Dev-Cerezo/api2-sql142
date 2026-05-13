const multer = require("multer");
const { ensureSvUploadDir } = require("../lib/svUploadPaths");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      cb(null, ensureSvUploadDir());
    } catch (e) {
      cb(e);
    }
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = (file.mimetype && file.mimetype.split("/")[1]) || "bin";
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
  },
});

/** Multer listo para evidencias SV: tamaño máx. y solo imagen/PDF. */
module.exports = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    const ok =
      (file.mimetype && file.mimetype.startsWith("image/")) ||
      file.mimetype === "application/pdf";
    if (ok) return cb(null, true);
    cb(new Error("Solo se permiten imágenes o PDF."));
  },
});
