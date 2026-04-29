const sql = require("mssql");
const config = require("../../dbconfig");
const {
  normalizarBody,
  validar,
  prepararRow,
  TABLA_REGISTRO_CHOFER,
} = require("./registroValidators");

function parseISOdate(s) {
  if (s == null || String(s).trim() === "") {
    return null;
  }
  const d = String(s).trim().slice(0, 10);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    return null;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatoErrorValidacion(errores) {
  const err = new Error(`VALIDACION: ${errores.join(" | ")}`);
  throw err;
}

/**
 * Lista registros por fecha_registro (día inclusivo desde/hasta).
 * @param {string|null} desde - YYYY-MM-DD
 * @param {string|null} hasta - YYYY-MM-DD
 */
async function listarPorRango(desdeRaw, hastaRaw) {
  let desde = parseISOdate(desdeRaw);
  let hasta = parseISOdate(hastaRaw);

  if (!desde || !hasta) {
    const err = new Error(
      "VALIDACION: parámetros 'desde' y 'hasta' son obligatorios (YYYY-MM-DD)",
    );
    throw err;
  }

  if (desde > hasta) {
    const tmp = desde;
    desde = hasta;
    hasta = tmp;
  }

  /** Límite de filas por petición */
  const maxDias =
    Number(process.env.REGCHO_MAX_RANGO_DIAS) > 0
      ? Number(process.env.REGCHO_MAX_RANGO_DIAS)
      : 93;
  const diffDays = Math.ceil((hasta - desde) / 86400000) + 1;
  if (diffDays > maxDias) {
    throw new Error(
      `VALIDACION: el rango no debe superar ${maxDias} días`,
    );
  }

  const pool = await sql.connect(config);

  /** Cast a DATE inclusive */
  const result = await new sql.Request(pool)
    .input("desde", sql.Date, desde)
    .input("hasta", sql.Date, hasta)
    .query(`
      SELECT TOP 500
        id_registro,
        fecha_registro,
        unidad_n_economico,
        unidad_prj_code,
        rancho_codigo,
        odometro_km,
        nivel_combustible,
        actividad,
        estado_unidad,
        tipo_falla,
        usuario,
        fecha_actualizacion
      FROM ${TABLA_REGISTRO_CHOFER}
      WHERE CAST(fecha_registro AS DATE) >= @desde
        AND CAST(fecha_registro AS DATE) <= @hasta
      ORDER BY fecha_registro DESC, id_registro DESC;
    `);

  const rows =
    result && result.recordset && Array.isArray(result.recordset)
      ? result.recordset
      : [];

  return { success: true, total: rows.length, registros: rows };
}

async function actualizarPorId(idNum, rawBody) {
  const id_registro =
    typeof idNum === "string" ? parseInt(idNum, 10) : Number(idNum);
  if (!Number.isInteger(id_registro) || id_registro < 1) {
    formatoErrorValidacion(["id_registro inválido"]);
  }

  const params = normalizarBody(rawBody);
  const errores = validar(params);
  if (errores.length > 0) {
    formatoErrorValidacion(errores);
  }

  const row = prepararRow(params);

  const pool = await sql.connect(config);
  const r = await new sql.Request(pool)
    .input("id_registro", sql.Int, id_registro)
    .input("unidad_n_economico", sql.NVarChar(50), row.unidad_n_economico)
    .input("unidad_prj_code", sql.NVarChar(50), row.unidad_prj_code)
    .input("rancho_codigo", sql.NVarChar(50), row.rancho_codigo)
    .input("odometro_km", sql.Decimal(12, 2), row.odometro_km)
    .input("nivel_combustible", sql.TinyInt, row.nivel_combustible)
    .input("actividad", sql.NVarChar(80), row.actividad)
    .input("estado_unidad", sql.NVarChar(10), row.estado_unidad)
    .input("tipo_falla", sql.Char(1), row.tipo_falla)
    .input("usuario", sql.NVarChar(128), row.usuario)
    .query(`
      UPDATE ${TABLA_REGISTRO_CHOFER}
      SET
        unidad_n_economico = @unidad_n_economico,
        unidad_prj_code = @unidad_prj_code,
        rancho_codigo = @rancho_codigo,
        odometro_km = @odometro_km,
        nivel_combustible = @nivel_combustible,
        actividad = @actividad,
        estado_unidad = @estado_unidad,
        tipo_falla = @tipo_falla,
        usuario = @usuario,
        fecha_actualizacion = SYSUTCDATETIME()
      WHERE id_registro = @id_registro;
    `);

  const affected = Array.isArray(r.rowsAffected)
    ? r.rowsAffected[0]
    : r.rowsAffected;

  if (!affected) {
    const nf = new Error("VALIDACION: no existe un registro con ese id_registro");
    throw nf;
  }

  return { success: true, id_registro, message: "Registro actualizado" };
}

async function eliminarPorId(idNum) {
  const id_registro =
    typeof idNum === "string" ? parseInt(idNum, 10) : Number(idNum);
  if (!Number.isInteger(id_registro) || id_registro < 1) {
    formatoErrorValidacion(["id_registro inválido"]);
  }

  const pool = await sql.connect(config);
  const r = await new sql.Request(pool)
    .input("id_registro", sql.Int, id_registro)
    .query(`
      DELETE FROM ${TABLA_REGISTRO_CHOFER}
      WHERE id_registro = @id_registro;
    `);

  const deleted = Array.isArray(r.rowsAffected)
    ? r.rowsAffected[0]
    : r.rowsAffected;

  if (!deleted) {
    const nf = new Error("VALIDACION: no existe un registro con ese id_registro");
    throw nf;
  }

  return { success: true, id_registro, message: "Registro eliminado" };
}

module.exports = {
  listarPorRango,
  actualizarPorId,
  eliminarPorId,
};
