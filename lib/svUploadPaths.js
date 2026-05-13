/**
 * Ruta única para evidencias SV (multer + GET /api/images/sv/:image).
 * Windows / desarrollo: api2-sql142/uploads/sv (se crea si no existe).
 * Linux servidor: /mnt/archivosapp/SV (debe existir en producción).
 * Opcional: variable de entorno SV_EVIDENCIAS_DIR para forzar otra ruta.
 */
const path = require("path");
const fs = require("fs");

function resolveSvUploadDir() {
  const fromEnv = String(process.env.SV_EVIDENCIAS_DIR || "").trim();
  if (fromEnv) return fromEnv;
  const isWin =
    process.platform === "win32" || /:\\|^\\\\/.test(__dirname);
  if (isWin) {
    return path.join(__dirname, "..", "uploads", "sv");
  }
  return "/mnt/archivosapp/SV";
}

/** Garantiza carpeta en dev; en /mnt/* no intenta crear. */
function ensureSvUploadDir() {
  const dir = resolveSvUploadDir();
  if (!dir.startsWith("/mnt/")) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  return dir;
}

module.exports = {
  resolveSvUploadDir,
  ensureSvUploadDir,
};
