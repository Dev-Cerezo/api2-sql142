/**
 * RBAC para rutas /api/sv. El rol proviene del JWT (firmado en login); no usar roles del body ni del cliente.
 */
function requireSvRole(...allowed) {
  const set = new Set(allowed);
  return function requireSvRoleMiddleware(req, res, next) {
    const rol = req.user && req.user.rol;
    if (!rol) {
      return res.status(403).json({
        message: "Sesión sin rol de aplicación. Cierre sesión y vuelva a entrar.",
      });
    }
    if (!set.has(rol)) {
      return res.status(403).json({ message: "No autorizado para esta operación." });
    }
    next();
  };
}

function requireSvGerenteReportOwnOrAdmin(req, res, next) {
  const rol = req.user && req.user.rol;
  const uid = req.user && req.user.id != null ? parseInt(req.user.id, 10) : NaN;
  const idg = req.params && req.params.idgerente != null ? parseInt(req.params.idgerente, 10) : NaN;
  if (rol === "admin") return next();
  if (Number.isFinite(uid) && Number.isFinite(idg) && uid === idg) return next();
  return res.status(403).json({ message: "No autorizado para consultar este reporte." });
}

/** Igual que bandera JWT soporteReporte: DO / Nómina siempre pueden apoyar (token antiguo sin flag). */
function esPrivilegioApoyoSv(user) {
  if (!user) return false;
  if (user.soporteReporte === true) return true;
  const r = user.rol;
  return r === "do" || r === "nomina";
}

/** Día del mes en calendario México (Ciudad de México), alineado con la operación del negocio. */
function diaMesNaturalMexicoCiudad() {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      day: "numeric",
    }).formatToParts(new Date());
    const d = parts.find((p) => p.type === "day");
    if (d) return parseInt(d.value, 10);
  } catch (_e) {}
  return new Date().getDate();
}

/** TEMP prueba: último día del mes permitido (inclusive). En producción suele ser 10. */
const VENTANA_SV_DIA_MAX_INCLUSIVE = 10;

/** Ventana calendario mes natural (días 1..VENTANA_SV_DIA_MAX_INCLUSIVE) para carga (no aplica a soporte reporte global). */
function requireVentanaCargaResultados(req, res, next) {
  if (esPrivilegioApoyoSv(req.user)) {
    return next();
  }
  const day = diaMesNaturalMexicoCiudad();
  if (day >= 1 && day <= VENTANA_SV_DIA_MAX_INCLUSIVE) {
    return next();
  }
  return res.status(403).json({
    message:
      `Fuera del periodo de carga (días 1 al ${VENTANA_SV_DIA_MAX_INCLUSIVE}). Solicite apoyo al equipo de Reporte Global / DO.`,
  });
}

/** Alineado al cliente appSV: perfil reporte global / DO / Nómina (no basta soporteReporte sin señales en puesto/correo). */
function normalizePuestoSv(p) {
  return String(p || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function coincidePerfilReporteGlobalJwt(user) {
  if (!user) return false;
  const rol = user.rol;
  if (rol === "do" || rol === "nomina") return true;
  const email = String(user.email || "").trim().toLowerCase();
  if (email === "cgarcia@grupoelcerezo.com") return true;
  const pNorm = normalizePuestoSv(user.puesto);
  const exact = new Set([
    "LIDER DO EN CAMPO",
    "ESPECIALISTA DO",
    "GERENTE DESARROLLO ORGANIZACIONAL",
    "GERENTE DE DESARROLLO ORGANIZACIONAL",
    "ANALISTA DO",
    "LIDER DO",
    "ANALISTA DE NOMINAS",
    "GERENTE DE NOMINAS",
    "LIDER DE NOMINAS",
    "SUPERVISOR APUNTADOR NOMINA",
  ]);
  if (exact.has(pNorm)) return true;
  if (user.soporteReporte !== true) return false;
  if (pNorm.indexOf(" DO") !== -1) return true;
  if (pNorm.indexOf("NOMINAS") !== -1) return true;
  if (
    pNorm.indexOf("DESARROLLO ORGANIZACIONAL") !== -1 &&
    (pNorm.indexOf("GERENTE") !== -1 ||
      pNorm.indexOf("ANALISTA") !== -1 ||
      pNorm.indexOf("ESPECIALISTA") !== -1 ||
      pNorm.indexOf("LIDER") !== -1)
  ) {
    return true;
  }
  return false;
}

/** Aprobación fuera del 1–N: solo coincidePerfilReporteGlobalJwt; dentro de ventana cualquier staff ya autorizado por rutas. */
function requireVentanaAprobacion(req, res, next) {
  const day = diaMesNaturalMexicoCiudad();
  if (day >= 1 && day <= VENTANA_SV_DIA_MAX_INCLUSIVE) {
    return next();
  }
  if (coincidePerfilReporteGlobalJwt(req.user)) {
    return next();
  }
  return res.status(403).json({
    message:
      `Fuera del periodo de aprobación (días 1 al ${VENTANA_SV_DIA_MAX_INCLUSIVE}). Solicite apoyo al equipo de Reporte Global / DO.`,
  });
}

const STAFF_ROLES = new Set(["admin", "gerente", "supervisor", "do", "nomina"]);

function requireStaffOrSoporteReporte(req, res, next) {
  const rol = req.user && req.user.rol;
  if (esPrivilegioApoyoSv(req.user)) {
    return next();
  }
  if (!rol) {
    return res.status(403).json({
      message: "Sesión sin rol de aplicación. Cierre sesión y vuelva a entrar.",
    });
  }
  if (STAFF_ROLES.has(rol)) {
    return next();
  }
  return res.status(403).json({ message: "No autorizado para esta operación." });
}

function requireIndicadoresUsuarioScope(req, res, next) {
  if (esPrivilegioApoyoSv(req.user)) {
    return next();
  }
  const rol = req.user && req.user.rol;
  const uid = req.user && req.user.id != null ? String(req.user.id) : "";
  const bodyId =
    req.body && req.body.id != null ? String(req.body.id).trim() : "";
  if (rol === "usuario" && bodyId && bodyId !== uid) {
    return res.status(403).json({ message: "No autorizado." });
  }
  const forQ =
    req.query && req.query.forUsuarioId != null
      ? String(req.query.forUsuarioId).trim()
      : "";
  if (rol === "usuario" && forQ && forQ !== uid) {
    return res.status(403).json({ message: "No autorizado." });
  }
  next();
}

requireSvRole.requireSvGerenteReportOwnOrAdmin = requireSvGerenteReportOwnOrAdmin;
requireSvRole.requireIndicadoresUsuarioScope = requireIndicadoresUsuarioScope;
requireSvRole.requireVentanaCargaResultados = requireVentanaCargaResultados;
requireSvRole.requireVentanaAprobacion = requireVentanaAprobacion;
requireSvRole.requireStaffOrSoporteReporte = requireStaffOrSoporteReporte;
requireSvRole.coincidePerfilReporteGlobalJwt = coincidePerfilReporteGlobalJwt;
requireSvRole.esPrivilegioApoyoSv = esPrivilegioApoyoSv;

module.exports = requireSvRole;
