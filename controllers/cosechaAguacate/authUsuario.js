/**
 * Usuario efectivo tras auth JWT en rutas cosecha-aguacate (Bearer).
 */
function usuarioDesdeCabeceras(req) {
  if (req.cosechaUser && req.cosechaUser.email) {
    return String(req.cosechaUser.email).trim();
  }
  return "";
}

module.exports = {
  usuarioDesdeCabeceras,
};
