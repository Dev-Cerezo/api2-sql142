/**
 * Tabla dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01 — columnas explícitas (sin JSON).
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
  const raw = String(celda ?? "").trim();
  if (raw === "#") {
    return null;
  }
  const t = normalizarTexto(raw).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
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
  if (/punto.*condens|condensacion|dew.*point|rocio/.test(k)) {
    return false;
  }
  return (
    /temp|temperat|celsius|^c$|°|centigrad/i.test(k) ||
    k === "t" ||
    k.includes("temp_")
  );
}

/**
 * Humedad relativa (%), p. ej. "Ch:2 - RH (%)" → slug ch2_rh_pct.
 */
function columnaEsHumedadRelativa(key) {
  const k = normalizarTexto(key);
  if (!k) {
    return false;
  }
  if (/temp|temperat|condens|rocio|dew|punto/.test(k)) {
    return false;
  }
  return k.includes("rh") || k.includes("humedad") || k.includes("hum_rel");
}

/**
 * Punto de rocío / condensación (°C).
 */
function columnaEsPuntoCondensacion(key) {
  const k = normalizarTexto(key);
  if (!k) {
    return false;
  }
  return /condensacion|condens|dew|rocio|punto_de_condens/.test(k);
}

/**
 * Columna(s) de fecha/hora procedente del archivo / sensor.
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
  columnaEsHumedadRelativa,
  columnaEsPuntoCondensacion,
  columnaEsFechaArchivo,
};
