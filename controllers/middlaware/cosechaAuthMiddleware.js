/**
 * JWT emitido por loginAguacateTemperatura (usuarios / roles aplicación).
 * Requiere claim `email` y `purpose: aguacate_temp`.
 */
const path = require("path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

const environment = (process.env.NODE_ENV || "development").trim();
dotenv.config({
  path: path.join(__dirname, "..", "..", `.env.${environment}`),
});
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const SECRET =
  process.env.JWT_PASSWORD_SECRET ||
  /** @deprecated alinear con jwt.sign en apilogin/login.js */
  "TuFirmaSecreta";

module.exports = function cosechaAuthMiddleware(req, res, next) {
  const hdrRaw = req.headers.authorization || req.headers.Authorization;
  const hdr = hdrRaw != null ? String(hdrRaw).trim() : "";
  const m = hdr.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Se requiere token de autorización (Authorization: Bearer …).",
    });
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        error: "Token inválido o expirado.",
      });
    }
    if (!decoded || decoded.purpose !== "aguacate_temp" || !decoded.email) {
      return res.status(403).json({
        success: false,
        error: "Token no válido para esta aplicación.",
      });
    }
    req.cosechaUser = decoded;
    next();
  });
}
