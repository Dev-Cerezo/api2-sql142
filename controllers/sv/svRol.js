const sql = require("mssql");

/**
 * Regla de rol appSV (misma lógica que indicadores/appSV/js/login.js, unificada en servidor).
 * Orden: DIRECTOR → admin; GERENTE / COORDINADOR… → gerente; " DO" → do; NOMINAS → nomina;
 * si no: supervisor si tiene colaboradores directos, si no usuario.
 */
async function colaboradoresDirectos(pool, idEmpleado) {
  const cantidad = await pool
    .request()
    .input("id_empleado", sql.Int, idEmpleado)
    .query(
      "SELECT count(*) as cantidad FROM TempusGEC.dbo.Empleado e WHERE e.ID_JefeDirecto = @id_empleado"
    );
  return cantidad.recordsets[0][0].cantidad;
}

async function computeSvRol(pool, idEmpleado, puesto) {
  const p = String(puesto || "");
  if (p.includes("DIRECTOR")) return "admin";
  if (p.includes("GERENTE") || p.includes("COORDINADOR NORMATIVO VIVIENDA")) return "gerente";
  if (p.includes(" DO")) return "do";
  if (p.includes("NOMINAS")) return "nomina";
  const n = await colaboradoresDirectos(pool, idEmpleado);
  return n > 0 ? "supervisor" : "usuario";
}

/**
 * Misma regla que indicadores/appSV/js/index.js para mostrar "REPORTE A DETALLE" (repGlobal).
 * Quien tenga esto puede apoyar cargas/aprobaciones fuera de la ventana 1–10.
 */
function normalizePuestoDesc(p) {
  return String(p || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function computeSoporteReporte(puesto, email) {
  const e = String(email || "").trim().toLowerCase();
  if (e === "cgarcia@grupoelcerezo.com") return true;
  const pNorm = normalizePuestoDesc(puesto);

  const puestosDo = [
    "LIDER DO EN CAMPO",
    "ESPECIALISTA DO",
    "GERENTE DESARROLLO ORGANIZACIONAL",
    "GERENTE DE DESARROLLO ORGANIZACIONAL",
    "ANALISTA DO",
    "LIDER DO",
  ];
  if (puestosDo.some((x) => normalizePuestoDesc(x) === pNorm)) return true;
  if (pNorm.includes(" DO")) return true;
  if (
    pNorm.includes("DESARROLLO ORGANIZACIONAL") &&
    (pNorm.includes("GERENTE") ||
      pNorm.includes("ANALISTA") ||
      pNorm.includes("ESPECIALISTA") ||
      pNorm.includes("LIDER"))
  ) {
    return true;
  }

  const puestosNom = [
    "ANALISTA DE NOMINAS",
    "GERENTE DE NOMINAS",
    "LIDER DE NOMINAS",
    "SUPERVISOR APUNTADOR NOMINA",
  ];
  if (puestosNom.some((x) => normalizePuestoDesc(x) === pNorm)) return true;
  if (pNorm.includes("NOMINAS")) return true;
  return false;
}

module.exports = { computeSvRol, colaboradoresDirectos, computeSoporteReporte };
