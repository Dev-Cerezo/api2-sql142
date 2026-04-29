/**
 * Cabeceras de usuario para rutas Cosecha Aguacate (sesión cliente → X-Usuario).
 */
function usuarioDesdeCabeceras(req) {
  const raw =
    req.headers["x-usuario"] ||
    req.headers["x-login-usuario"] ||
    "";
  return String(raw).trim();
}

module.exports = {
  usuarioDesdeCabeceras,
};
