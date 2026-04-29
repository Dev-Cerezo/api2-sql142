/**
 * Una sola tabla (sql/CosechaAguacate.sql): filas Excel + metadatos.
 */
const TABLA_REGISTRO =
  "dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01";

const NOMBRE_HOJA_DATOS = "fecha"; /* Solo esta hoja; no Eventos ni Detalles */

function normalizarTexto(s) {
  if (s == null) {
    return "";
  }
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function slugHeader(celda) {
  const t = normalizarTexto(celda).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return t || null;
}

/**
 * Detecta columna numérica de temperatura a partir del nombre de encabezado.
 */
function columnaEsTemperatura(key) {
  const k = normalizarTexto(key);
  if (!k) {
    return false;
  }
  return (
    /temp|temperat|celsius|^c$|°|centigrad/i.test(k) ||
    k === "t" ||
    k.includes("temp_")
  );
}

/**
 * Detecta columna(s) de fecha/hora procedente del archivo.
 */
function columnaEsFechaArchivo(key) {
  const k = normalizarTexto(key);
  if (!k) {
    return false;
  }
  if (k === "fecha_registro_real" || k === "fecha_registro_usuario") {
    return false;
  }
  return /fecha|date|hora|time|timestamp|fecha_/.test(k);
}

module.exports = {
  TABLA_REGISTRO,
  NOMBRE_HOJA_DATOS,
  normalizarTexto,
  slugHeader,
  columnaEsTemperatura,
  columnaEsFechaArchivo,
};
