const crypto = require("crypto");
const sql = require("mssql");
const XLSX = require("xlsx");
const config = require("../../dbconfig");
const {
  TABLA_REGISTRO,
  NOMBRE_HOJA_DATOS,
  slugHeader,
  columnaEsTemperatura,
  columnaEsFechaArchivo,
} = require("./cosechaValidators");

/** Serial de Excel → Date (aprox. zona local). */
function excelSerialToDate(serial) {
  if (typeof serial !== "number" || !Number.isFinite(serial)) {
    return null;
  }
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const fractionalDay = serial - Math.floor(serial) + 1e-12;
  const seconds = Math.round(fractionalDay * 86400);
  return new Date(utcValue * 1000 + seconds * 1000);
}

function parseFlexibleDate(val) {
  if (val == null || val === "") {
    return null;
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }
  if (typeof val === "number") {
    if (val > 20000 && val < 80000) {
      return excelSerialToDate(val);
    }
    return null;
  }
  const s = String(val).trim();
  const direct = new Date(s);
  if (!isNaN(direct.getTime())) {
    return direct;
  }
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) {
      year += 2000;
    }
    return new Date(year, month - 1, day);
  }
  return null;
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

/**
 * Solo hoja cuyo nombre (trim, case insensitive) coincide con "Fecha".
 */
function obtenerHojaFecha(workbook) {
  const names = workbook.SheetNames || [];
  const match = names.find(
    (n) => String(n).trim().toLowerCase() === NOMBRE_HOJA_DATOS
  );
  if (!match) {
    const lista = names.join(", ");
    const err = new Error(
      `VALIDACION: No se encontró la hoja "Fecha". Hojas presentes: ${lista || "(ninguna)"}`
    );
    throw err;
  }
  return workbook.Sheets[match];
}

function hojaAFilasObjetos(ws) {
  const matrix = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });
  if (!matrix || matrix.length < 2) {
    return { headers: [], rows: [] };
  }
  const headerRow = matrix[0].map(slugHeader);
  const rows = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i];
    if (!line || !line.some((c) => c != null && String(c).trim() !== "")) {
      continue;
    }
    const o = {};
    headerRow.forEach((h, j) => {
      if (!h) {
        return;
      }
      o[h] = line[j];
    });
    rows.push(o);
  }
  return { headers: headerRow.filter(Boolean), rows };
}

/**
 * Procesa buffer XLSX: valida centro (CECOS), inserta o reemplaza carga por hash.
 * fecha_registro_real la asigna el servidor (DEFAULT GETDATE); usuario desde opts.usuario_alta (cabecera).
 * @param {object} opts
 * @param {Buffer} opts.buffer
 * @param {string} opts.originalname
 * @param {string} opts.codigo_centro_costo  CODIGO del catálogo getCecos
 * @param {string} opts.usuario_alta obligatorio (cabecera X-Usuario)
 * @param {boolean} opts.reemplazar_si_duplicado
 */
async function procesarCargaArchivo(opts) {
  const buffer = opts.buffer;
  const originalname = opts.originalname || "archivo.xlsx";
  const codigoCc =
    opts.codigo_centro_costo != null
      ? String(opts.codigo_centro_costo).trim()
      : "";
  const usuarioAlta =
    opts.usuario_alta != null ? String(opts.usuario_alta).trim() : "";
  const reemplazar = Boolean(opts.reemplazar_si_duplicado);

  if (!buffer || buffer.length === 0) {
    const err = new Error("VALIDACION: Archivo vacío o no recibido");
    throw err;
  }
  if (!codigoCc) {
    const err = new Error(
      "VALIDACION: codigo_centro_costo es obligatorio (catálogo CECOS)"
    );
    throw err;
  }
  if (!usuarioAlta) {
    const err = new Error(
      "VALIDACION: usuario no identificado; inicie sesión o envíe cabecera X-Usuario"
    );
    throw err;
  }

  const hash = crypto.createHash("sha256").update(buffer).digest();
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = obtenerHojaFecha(wb);
  const { rows } = hojaAFilasObjetos(ws);

  if (rows.length === 0) {
    const err = new Error(
      'VALIDACION: La hoja "Fecha" no tiene filas de datos (solo encabezados o vacía)'
    );
    throw err;
  }

  const pool = await sql.connect(config);

  const dup = await new sql.Request(pool)
    .input("h", sql.VarBinary(32), hash)
    .query(`
      SELECT TOP 1 id_registro FROM ${TABLA_REGISTRO}
      WHERE archivo_hash = @h AND estatus = 'A';
    `);
  const existingId =
    dup.recordset &&
    dup.recordset[0] &&
    dup.recordset[0].id_registro != null
      ? dup.recordset[0].id_registro
      : null;

  if (existingId && !reemplazar) {
    const err = new Error(
      "DUPLICADO: Este archivo ya fue cargado. Indique reemplazar_si_duplicado o use otro archivo."
    );
    err.code = "ARCHIVO_DUPLICADO";
    throw err;
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    if (existingId && reemplazar) {
      await new sql.Request(transaction)
        .input("h", sql.VarBinary(32), hash)
        .query(`DELETE FROM ${TABLA_REGISTRO} WHERE archivo_hash = @h;`);
    }

    let numeroFila = 0;
    for (const raw of rows) {
      numeroFila += 1;
      const datosJson = JSON.stringify(raw);
      const fechaArchivo = extraerFechaArchivo(raw);
      const temperatura = extraerTemperatura(raw);

      await new sql.Request(transaction)
        .input("h", sql.VarBinary(32), hash)
        .input("nombre", sql.NVarChar(400), originalname)
        .input("codigo", sql.NVarChar(64), codigoCc)
        .input("numero_fila", sql.Int, numeroFila)
        .input("json", sql.NVarChar(sql.MAX), datosJson)
        .input("fa", sql.DateTime2, fechaArchivo)
        .input("temp", sql.Decimal(14, 6), temperatura)
        .input("usuario", sql.NVarChar(128), usuarioAlta)
        .query(`
          INSERT INTO ${TABLA_REGISTRO} (
            archivo_hash,
            archivo_nombre,
            codigo_centro_costo,
            numero_fila,
            datos_json,
            fecha_archivo,
            temperatura,
            usuario_registro
          )
          VALUES (@h, @nombre, @codigo, @numero_fila, @json, @fa, @temp, @usuario);
        `);
    }

    await transaction.commit();

    return {
      success: true,
      filas_guardadas: rows.length,
      archivo_hash_sha256: hash.toString("hex"),
      reemplazo: Boolean(existingId && reemplazar),
      message:
        existingId && reemplazar
          ? "Carga actualizada (archivo duplicado reemplazado)"
          : "Carga registrada correctamente",
    };
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

module.exports = {
  procesarCargaArchivo,
  excelSerialToDate,
  parseFlexibleDate,
};
