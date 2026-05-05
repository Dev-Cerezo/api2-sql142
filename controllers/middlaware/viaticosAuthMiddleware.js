const path = require("path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

const env = (process.env.NODE_ENV || "development").trim();
dotenv.config({
  path: path.join(__dirname, "..", "..", `.env.${env}`),
});

const CAMPOS_ID_ACTOR = ["id_usuario", "usuario_actualizacion", "id_aprobador"];

module.exports = function viaticosAuthMiddleware(req, res, next) {
  if (req.method === "OPTIONS") return next();

  const hdr = req.headers.authorization || req.headers.Authorization;
  const token = hdr && hdr.split(" ")[1];
  const secret = process.env.JWT_PASSWORD_SECRET || "TuFirmaSecreta";

  if (!token) {
    return res.status(401).json({ success: false, error: "Token de sesión requerido" });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, error: "Sesión inválida o expirada" });
    }

    const jwtId = Number(decoded.id);
    if (!Number.isFinite(jwtId)) {
      return res.status(401).json({ success: false, error: "Sesión corrupta" });
    }

    req.jwtUsuario = decoded;

    const ctype = String(req.headers["content-type"] || "").toLowerCase();
    const isMultipart = ctype.includes("multipart/form-data");
    const b = req.body;
    const puedeAnalizarCuerpo =
      b && typeof b === "object" && !Buffer.isBuffer(b) && !isMultipart && req.method !== "GET";

    if (puedeAnalizarCuerpo) {
      for (const campo of CAMPOS_ID_ACTOR) {
        if (!(campo in b)) continue;
        if (b[campo] === undefined || b[campo] === null || String(b[campo]).trim() === "") continue;
        if (Number(b[campo]) !== jwtId) {
          return res.status(403).json({
            success: false,
            error:
              "La solicitud incluye datos de usuario que no coinciden con su sesión.",
          });
        }
      }

      if (b.id_usuario === undefined || b.id_usuario === null || String(b.id_usuario).trim() === "") {
        b.id_usuario = jwtId;
      }
      if (
        Object.prototype.hasOwnProperty.call(b, "usuario_actualizacion") &&
        (b.usuario_actualizacion === undefined ||
          b.usuario_actualizacion === null ||
          String(b.usuario_actualizacion).trim() === "")
      ) {
        b.usuario_actualizacion = jwtId;
      }
    }

    next();
  });
};
