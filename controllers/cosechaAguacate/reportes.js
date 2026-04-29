const sql = require("mssql");
const config = require("../../dbconfig");
const {
  TABLA_REGISTRO,
  columnaEsTemperatura,
  columnaEsFechaArchivo,
} = require("./cosechaValidators");
const { parseFlexibleDate } = require("./carga");

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

function extraerTemperatura(obj) {
  if (!obj || typeof obj !== "object") {
    return null;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (!columnaEsTemperatura(k)) {
      continue;
    }
    const n =
      typeof v === "number"
        ? v
        : parseFloat(String(v).replace(",", "."));
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

function extraerFechaArchivo(obj) {
  if (!obj || typeof obj !== "object") {
    return null;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (!columnaEsFechaArchivo(k)) {
      continue;
    }
    const d = parseFlexibleDate(v);
    if (d && !isNaN(d.getTime())) {
      return d;
    }
  }
  return null;
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

  const result = await rq.query(`
    SELECT TOP 8000
      r.id_registro,
      r.numero_fila,
      r.datos_json,
      r.fecha_archivo,
      r.temperatura,
      r.fecha_actualizacion,
      r.estatus AS estatus_registro,
      r.archivo_nombre,
      r.fecha_registro_real,
      r.usuario_registro AS usuario_alta,
      r.codigo_centro_costo AS centro_codigo
    FROM ${TABLA_REGISTRO} r
    WHERE CAST(r.fecha_registro_real AS DATE) >= @desde
      AND CAST(r.fecha_registro_real AS DATE) <= @hasta
      ${filtroCc}
      ${filtroEstadoR}
    ORDER BY r.fecha_registro_real DESC, r.id_registro DESC;
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

  const baseWhere = `
    FROM ${TABLA_REGISTRO} r
    WHERE CAST(r.fecha_registro_real AS DATE) >= @desde
      AND CAST(r.fecha_registro_real AS DATE) <= @hasta
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
    SELECT CAST(COALESCE(r.fecha_archivo, CAST(r.fecha_registro_real AS DATETIME2)) AS DATE) AS dia,
           AVG(CAST(r.temperatura AS FLOAT)) AS temp_promedio,
           MIN(CAST(r.temperatura AS FLOAT)) AS temp_min,
           MAX(CAST(r.temperatura AS FLOAT)) AS temp_max,
           COUNT(*) AS muestras
    ${baseWhere}
    ${filtroCc}
    GROUP BY CAST(COALESCE(r.fecha_archivo, CAST(r.fecha_registro_real AS DATETIME2)) AS DATE)
    ORDER BY dia;
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

async function actualizarRegistro(idNum, rawBody) {
  const id_registro = parseIdRegistro(idNum);
  if (id_registro == null) {
    formatoErrorValidacion(["id_registro inválido"]);
  }

  let datosObj = null;
  if (rawBody.datos_json != null) {
    if (typeof rawBody.datos_json === "string") {
      try {
        datosObj = JSON.parse(rawBody.datos_json);
      } catch (e) {
        formatoErrorValidacion(["datos_json no es JSON válido"]);
      }
    } else if (typeof rawBody.datos_json === "object") {
      datosObj = rawBody.datos_json;
    }
  }

  if (!datosObj || typeof datosObj !== "object") {
    formatoErrorValidacion([
      "datos_json es obligatorio (objeto o string JSON)",
    ]);
  }

  const datosJson = JSON.stringify(datosObj);
  const fechaArchivo = extraerFechaArchivo(datosObj);
  const temperatura = extraerTemperatura(datosObj);

  const pool = await sql.connect(config);
  const r = await new sql.Request(pool)
    .input("id_registro", sql.BigInt, id_registro.toString())
    .input("json", sql.NVarChar(sql.MAX), datosJson)
    .input("fa", sql.DateTime2, fechaArchivo)
    .input("temp", sql.Decimal(14, 6), temperatura)
    .query(`
      UPDATE ${TABLA_REGISTRO}
      SET datos_json = @json,
          fecha_archivo = @fa,
          temperatura = @temp,
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
