const path = require("path");
const { resolveSvUploadDir } = require("../../lib/svUploadPaths");

/** Evidencias SV servidas como en api-sql142 (/api/images/sv/:image). */
async function getImageSV(req, res) {
  try {
    const image = path.basename(String(req.params.image || ""));
    if (!image || image === "." || image === "..") {
      return res.status(400).json({
        tabla: "sueldo variable",
        status: "ERROR",
        mensaje: "Nombre de archivo no válido.",
      });
    }
    const pathImage = path.join(resolveSvUploadDir(), image);
    res.sendFile(pathImage);
  } catch (error) {
    res.status(500).json({
      tabla: "sueldo variable",
      status: "ERROR",
      mensaje: error.message,
    });
  }
}

module.exports = {
  getImageSV,
};
