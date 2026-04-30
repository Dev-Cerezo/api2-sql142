const sql = require("mssql");
const config = require("../../dbconfig");
const { TABLA_REGISTRO } = require("./cosechaValidators");
const {
  HUMEDAD_RELATIVA_FISICO,
  PUNTO_CONDENSACION_FISICO,
} = require("./cosechaSqlColumns");
const { parseFlexibleDate } = require("./carga");
const {
  esTablaMinima,
  incluyeOrigenCargaEnInsertMinima,
  exprFechaDia,
  ordenFechaDesc,
  normalizarHrRocioParaNotNull,
} = require("./cosechaModoTabla");

function parseISOdateOnly(s) {
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

function fechaConsultaRow(alias) {
  return exprFechaDia(alias);
}

async function listarPorRango(desdeRaw, hastaRaw, codigoCentroCosto, incluirBaja) {
  let desde = parseISOdateOnly(desdeRaw);
  let hasta = parseISOdateOnly(hastaRaw);

  if (!desde || !hasta) {
    formatoErrorValidacion([
      "parámetros 'desde' y 'hasta' son obligatorios (YYYY-MM-DD)",
    ]);
  }

  if (desde > hasta) {
    const tmp = desde;
    desde = hasta;
    hasta = tmp;
  }

  const maxDias =
    Number(process.env.COSECHA_MAX_RANGO_DIAS) > 0
      ? Number(process.env.COSECHA_MAX_RANGO_DIAS)
      : 366;
  const diffDays = Math.ceil((hasta - desde) / 86400000) + 1;
  if (diffDays > maxDias) {
    throw new Error(`VALIDACION: el rango no debe superar ${maxDias} días`);
  }

  let codigoCc = null;
  if (
    codigoCentroCosto != null &&
    String(codigoCentroCosto).trim() !== ""
  ) {
    codigoCc = String(codigoCentroCosto).trim().slice(0, 64);
  }

  const incluyeBaja =
    incluirBaja === true ||
    incluirBaja === "1" ||
    incluirBaja === "true";

  const pool = await sql.connect(config);
  const rq = new sql.Request(pool)
    .input("desde", sql.Date, desde)
    .input("hasta", sql.Date, hasta);

  let filtroCc = "";
  if (codigoCc != null) {
    rq.input("codigo_cc", sql.NVarChar(64), codigoCc);
    filtroCc = " AND r.codigo_centro_costo = @codigo_cc ";
  }

  const filtroEstadoR = incluyeBaja ? "" : " AND r.estatus = 'A' ";
  const fechaFiltro = fechaConsultaRow("r");

  const selectLista = esTablaMinima()
    ? incluyeOrigenCargaEnInsertMinima()
      ? `
    SELECT TOP 8000
      r.id_registro,
      r.fecha_archivo,
      r.temperatura,
      r.${HUMEDAD_RELATIVA_FISICO} AS humedad_relativa_pct,
      r.${PUNTO_CONDENSACION_FISICO} AS punto_condensacion_c,
      r.origen_carga,
      r.fecha_actualizacion,
      r.estatus AS estatus_registro,
      CAST(NULL AS NVARCHAR(400)) AS archivo_nombre,
      CAST(COALESCE(CAST(r.fecha_archivo AS DATE), CAST(r.fecha_actualizacion AS DATE)) AS DATE) AS fecha_registro_real,
      r.usuario_registro AS usuario_alta,
      r.codigo_centro_costo AS centro_codigo
    `
      : `
    SELECT TOP 8000
      r.id_registro,
      r.fecha_archivo,
      r.temperatura,
      r.${HUMEDAD_RELATIVA_FISICO} AS humedad_relativa_pct,
      r.${PUNTO_CONDENSACION_FISICO} AS punto_condensacion_c,
      CAST(NULL AS CHAR(1)) AS origen_carga,
      r.fecha_actualizacion,
      r.estatus AS estatus_registro,
      CAST(NULL AS NVARCHAR(400)) AS archivo_nombre,
      CAST(COALESCE(CAST(r.fecha_archivo AS DATE), CAST(r.fecha_actualizacion AS DATE)) AS DATE) AS fecha_registro_real,
      r.usuario_registro AS usuario_alta,
      r.codigo_centro_costo AS centro_codigo
    `
    : `
    SELECT TOP 8000
      r.id_registro,
      r.fecha_archivo,
      r.temperatura,
      r.${HUMEDAD_RELATIVA_FISICO} AS humedad_relativa_pct,
      r.${PUNTO_CONDENSACION_FISICO} AS punto_condensacion_c,
      r.origen_carga,
      r.fecha_actualizacion,
      r.estatus AS estatus_registro,
      r.archivo_nombre,
      r.fecha_registro_real,
      r.usuario_registro AS usuario_alta,
      r.codigo_centro_costo AS centro_codigo
    `;

  const orderByLista = ordenFechaDesc("r");

  const result = await rq.query(`
    ${selectLista}
    FROM ${TABLA_REGISTRO} r
    WHERE ${fechaFiltro} >= @desde
      AND ${fechaFiltro} <= @hasta
      ${filtroCc}
      ${filtroEstadoR}
    ORDER BY ${orderByLista} DESC, r.id_registro DESC;
  `);

  const rows =
    result && result.recordset && Array.isArray(result.recordset)
      ? result.recordset
      : [];

  return { success: true, total: rows.length, registros: rows };
}

async function agregadosParaGraficos(desdeRaw, hastaRaw, codigoCentroCosto) {
  let desde = parseISOdateOnly(desdeRaw);
  let hasta = parseISOdateOnly(hastaRaw);
  if (!desde || !hasta) {
    formatoErrorValidacion([
      "parámetros 'desde' y 'hasta' son obligatorios (YYYY-MM-DD)",
    ]);
  }
  if (desde > hasta) {
    const t = desde;
    desde = hasta;
    hasta = t;
  }

  let codigoCc = null;
  if (
    codigoCentroCosto != null &&
    String(codigoCentroCosto).trim() !== ""
  ) {
    codigoCc = String(codigoCentroCosto).trim().slice(0, 64);
  }

  const pool = await sql.connect(config);
  const fechaFiltroSql = fechaConsultaRow("r");
  const fechaDiaGrp = fechaConsultaRow("r");
  const baseWhere = `
    FROM ${TABLA_REGISTRO} r
    WHERE ${fechaFiltroSql} >= @desde
      AND ${fechaFiltroSql} <= @hasta
      AND r.estatus = 'A'
      AND r.temperatura IS NOT NULL
  `;

  const rq1 = new sql.Request(pool)
    .input("desde", sql.Date, desde)
    .input("hasta", sql.Date, hasta);

  let filtroCc = "";
  if (codigoCc != null) {
    rq1.input("codigo_cc", sql.NVarChar(64), codigoCc);
    filtroCc = " AND r.codigo_centro_costo = @codigo_cc ";
  }

  const porDia = await rq1.query(`
    SELECT ${fechaDiaGrp} AS dia,
           AVG(CAST(r.temperatura AS FLOAT)) AS temp_promedio,
           MIN(CAST(r.temperatura AS FLOAT)) AS temp_min,
           MAX(CAST(r.temperatura AS FLOAT)) AS temp_max,
           COUNT(*) AS muestras
    ${baseWhere}
    ${filtroCc}
    GROUP BY ${fechaDiaGrp}
    ORDER BY dia;
  `);

  const rq1b = new sql.Request(pool)
    .input("desde", sql.Date, desde)
    .input("hasta", sql.Date, hasta);
  if (codigoCc != null) {
    rq1b.input("codigo_cc", sql.NVarChar(64), codigoCc);
  }
  const porDiaPorCentro = await rq1b.query(`
    SELECT ${fechaDiaGrp} AS dia,
           r.codigo_centro_costo AS centro_codigo,
           AVG(CAST(r.temperatura AS FLOAT)) AS temp_promedio,
           MIN(CAST(r.temperatura AS FLOAT)) AS temp_min,
           MAX(CAST(r.temperatura AS FLOAT)) AS temp_max,
           COUNT(*) AS muestras
    ${baseWhere}
    ${filtroCc}
    GROUP BY ${fechaDiaGrp},
             r.codigo_centro_costo
    ORDER BY dia, centro_codigo;
  `);

  const rq2 = new sql.Request(pool)
    .input("desde", sql.Date, desde)
    .input("hasta", sql.Date, hasta);
  if (codigoCc != null) {
    rq2.input("codigo_cc", sql.NVarChar(64), codigoCc);
  }
  const porCentro = await rq2.query(`
    SELECT r.codigo_centro_costo AS centro_codigo,
           AVG(CAST(r.temperatura AS FLOAT)) AS temp_promedio,
           COUNT(*) AS muestras
    ${baseWhere}
    ${filtroCc}
    GROUP BY r.codigo_centro_costo
    ORDER BY centro_codigo;
  `);

  return {
    success: true,
    por_dia: porDia.recordset || [],
    por_dia_por_centro: porDiaPorCentro.recordset || [],
    por_centro: porCentro.recordset || [],
  };
}

function parseIdRegistro(idNum) {
  let bi;
  try {
    bi = BigInt(String(idNum).trim());
  } catch (e) {
    return null;
  }
  if (bi <= 0n) {
    return null;
  }
  return bi;
}

function numeroONull(v) {
  if (v === undefined || v === null || v === "") {
    return null;
  }
  const n =
    typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function actualizarRegistro(idNum, rawBody) {
  const id_registro = parseIdRegistro(idNum);
  if (id_registro == null) {
    formatoErrorValidacion(["id_registro inválido"]);
  }

  const temperatura = numeroONull(rawBody.temperatura);
  if (temperatura == null) {
    formatoErrorValidacion(["temperatura obligatoria y numérica"]);
  }

  let fechaMedicion =
    rawBody.fecha_archivo != null &&
    rawBody.fecha_archivo !== "" &&
    String(rawBody.fecha_archivo).trim() !== ""
      ? parseFlexibleDate(rawBody.fecha_archivo)
      : rawBody.fecha_medicion != null &&
          rawBody.fecha_medicion !== "" &&
          String(rawBody.fecha_medicion).trim() !== ""
        ? parseFlexibleDate(rawBody.fecha_medicion)
        : null;

  if (
    fechaMedicion == null ||
    isNaN(fechaMedicion.getTime())
  ) {
    formatoErrorValidacion([
      "fecha_archivo / fecha_medicion obligatoria con formato válido",
    ]);
  }

  const hum = numeroONull(rawBody.humedad_relativa_pct);
  const rocio = numeroONull(rawBody.punto_condensacion_c);
  let hrSet = hum;
  let rocioSet = rocio;
  if (esTablaMinima()) {
    const nrm = normalizarHrRocioParaNotNull(hum, rocio, temperatura);
    hrSet = nrm.hr;
    rocioSet = nrm.rocio;
  }

  const pool = await sql.connect(config);
  const r = await new sql.Request(pool)
    .input("id_registro", sql.BigInt, id_registro.toString())
    .input("temp", sql.Decimal(14, 6), temperatura)
    .input("fa", sql.DateTime2, fechaMedicion)
    .input("hr", sql.Decimal(14, 6), hrSet)
    .input("rocio", sql.Decimal(14, 6), rocioSet)
    .query(`
      UPDATE ${TABLA_REGISTRO}
      SET temperatura = @temp,
          fecha_archivo = @fa,
          ${HUMEDAD_RELATIVA_FISICO} = @hr,
          ${PUNTO_CONDENSACION_FISICO} = @rocio,
          fecha_actualizacion = SYSUTCDATETIME()
      WHERE id_registro = @id_registro AND estatus = 'A';
    `);

  const affected = Array.isArray(r.rowsAffected)
    ? r.rowsAffected[0]
    : r.rowsAffected;

  if (!affected) {
    const nf = new Error("VALIDACION: no existe un registro activo con ese id");
    throw nf;
  }

  return {
    success: true,
    id_registro: id_registro.toString(),
    message: "Registro actualizado",
  };
}

async function eliminarLogico(idNum) {
  const id_registro = parseIdRegistro(idNum);
  if (id_registro == null) {
    formatoErrorValidacion(["id_registro inválido"]);
  }

  const pool = await sql.connect(config);
  const r = await new sql.Request(pool)
    .input("id_registro", sql.BigInt, id_registro.toString())
    .query(`
      UPDATE ${TABLA_REGISTRO}
      SET estatus = 'B', fecha_actualizacion = SYSUTCDATETIME()
      WHERE id_registro = @id_registro AND estatus = 'A';
    `);

  const affected = Array.isArray(r.rowsAffected)
    ? r.rowsAffected[0]
    : r.rowsAffected;

  if (!affected) {
    const nf = new Error("VALIDACION: no existe un registro activo con ese id");
    throw nf;
  }

  return {
    success: true,
    id_registro: id_registro.toString(),
    message: "Registro eliminado (lógico)",
  };
}

module.exports = {
  listarPorRango,
  agregadosParaGraficos,
  actualizarRegistro,
  eliminarLogico,
};
