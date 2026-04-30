/**
 * Por defecto: tabla corta como en producción (sin archivo_hash ni numero_fila).
 * Solo si necesita archivo_hash Excel + duplicados: COSECHA_TABLA_COMPLETA=1 en .env
 *
 * Si la tabla corta aún NO tiene columna origen_carga: COSECHA_TABLA_SIN_ORIGEN_CARGA=1
 * (omitir en INSERT). En GAECTIDB_PRU típico la columna existe NOT NULL → no poner ese flag.
 */
function esTablaMinima() {
  const completa =
    process.env.COSECHA_TABLA_COMPLETA === "1" ||
    String(process.env.COSECHA_TABLA_COMPLETA || "").toLowerCase() === "true";
  if (completa) {
    return false;
  }
  return true;
}

function incluyeOrigenCargaEnInsertMinima() {
  const omitir =
    process.env.COSECHA_TABLA_SIN_ORIGEN_CARGA === "1" ||
    String(process.env.COSECHA_TABLA_SIN_ORIGEN_CARGA || "")
      .toLowerCase()
      === "true";
  return !omitir;
}

/**
 * RH / rocío NOT NULL en BD pero el cliente omitió valores → valores de relleno mínimos.
 * (Interpretación: tabla no admite NULL; 0 aquí solo satisface tipo; mejor capturar dato real en UI cuando sea obligatorio.)
 */
function normalizarHrRocioParaNotNull(hr, rocio, temperatura) {
  let h = hr;
  let r = rocio;
  if (h == null || !Number.isFinite(h)) {
    h = 0;
  }
  if (r == null || !Number.isFinite(r)) {
    r = temperatura != null && Number.isFinite(temperatura) ? temperatura : 0;
  }
  return { hr: h, rocio: r };
}

function exprFechaDia(alias) {
  if (esTablaMinima()) {
    return `CAST(COALESCE(${alias}.fecha_archivo, ${alias}.fecha_actualizacion) AS DATE)`;
  }
  return `CAST(COALESCE(${alias}.fecha_archivo, CAST(${alias}.fecha_registro_real AS DATETIME2)) AS DATE)`;
}

function ordenFechaDesc(alias) {
  if (esTablaMinima()) {
    return `COALESCE(${alias}.fecha_archivo, ${alias}.fecha_actualizacion)`;
  }
  return `COALESCE(${alias}.fecha_archivo, CAST(${alias}.fecha_registro_real AS DATETIME2))`;
}

module.exports = {
  esTablaMinima,
  incluyeOrigenCargaEnInsertMinima,
  normalizarHrRocioParaNotNull,
  exprFechaDia,
  ordenFechaDesc,
};
