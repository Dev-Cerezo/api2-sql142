const crypto = require("crypto");
const sql = require("mssql");
const XLSX = require("xlsx");
const config = require("../../dbconfig");
const {
  TABLA_REGISTRO,
  NOMBRE_HOJA_DATOS,
  slugHeader,
  columnaEsTemperatura,
  columnaEsHumedadRelativa,
  columnaEsPuntoCondensacion,
  columnaEsFechaArchivo,
} = require("./cosechaValidators");
const {
  HUMEDAD_RELATIVA_FISICO,
  PUNTO_CONDENSACION_FISICO,
} = require("./cosechaSqlColumns");
const {
  esTablaMinima,
  incluyeOrigenCargaEnInsertMinima,
  normalizarHrRocioParaNotNull,
} = require("./cosechaModoTabla");

/**
 * opcional body `origen_carga`: E / Excel, M / manual; si viene vacío → predeterminado del flujo.
 */
function resolverOrigenCarga(valorBruto, predeterminado) {
  if (valorBruto == null || String(valorBruto).trim() === "") {
    return predeterminado;
  }
  const u = String(valorBruto).trim().toUpperCase();
  if (u === "E" || u === "EXCEL") {
    return "E";
  }
  if (u === "M" || u === "MANUAL") {
    return "M";
  }
  const err = new Error(
    "VALIDACION: origen_carga debe ser E (Excel/archivo) o M (captura manual)"
  );
  throw err;
}

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
  /* DD/MM/YYYY [HH:MM[:SS]] (typ. Excel México / logger CST) antes que Date(...) ambiguo */
  const dmyTime = s.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (dmyTime) {
    const day = Number(dmyTime[1]);
    const month = Number(dmyTime[2]);
    let year = Number(dmyTime[3]);
    if (year < 100) {
      year += 2000;
    }
    const hh = dmyTime[4] != null ? Number(dmyTime[4]) : 0;
    const mm = dmyTime[5] != null ? Number(dmyTime[5]) : 0;
    const ss = dmyTime[6] != null ? Number(dmyTime[6]) : 0;
    const dd = new Date(year, month - 1, day, hh, mm, ss);
    if (!isNaN(dd.getTime())) {
      return dd;
    }
  }
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

function extraerValorNumericoPorColumna(obj, fnColumna) {
  for (const [k, v] of Object.entries(obj)) {
    if (!fnColumna(k)) {
      continue;
    }
    if (v == null || v === "") {
      continue;
    }
    const n =
      typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

function extraerTemperatura(obj) {
  return extraerValorNumericoPorColumna(obj, columnaEsTemperatura);
}

function extraerHumedadRelativa(obj) {
  return extraerValorNumericoPorColumna(obj, columnaEsHumedadRelativa);
}

function extraerPuntoCondensacion(obj) {
  return extraerValorNumericoPorColumna(obj, columnaEsPuntoCondensacion);
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
    return { headers: [], headerLabels: [], rows: [] };
  }
  const headerLabels = matrix[0] || [];
  const headerRow = headerLabels.map(slugHeader);
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
  return {
    headers: headerRow.filter(Boolean),
    headerLabels,
    rows,
  };
}

function sqlInsertLectura() {
  const minSinOrigen =
    esTablaMinima() && !incluyeOrigenCargaEnInsertMinima();
  if (minSinOrigen) {
    return `
    INSERT INTO ${TABLA_REGISTRO} (
      codigo_centro_costo,
      fecha_archivo,
      temperatura,
      ${HUMEDAD_RELATIVA_FISICO},
      ${PUNTO_CONDENSACION_FISICO},
      usuario_registro
    )
    VALUES (
      @codigo, @fa, @temp,
      @hr, @rocio, @usuario
    );
  `;
  }
  if (esTablaMinima()) {
    return `
    INSERT INTO ${TABLA_REGISTRO} (
      codigo_centro_costo,
      fecha_archivo,
      temperatura,
      ${HUMEDAD_RELATIVA_FISICO},
      ${PUNTO_CONDENSACION_FISICO},
      origen_carga,
      usuario_registro
    )
    VALUES (
      @codigo, @fa, @temp,
      @hr, @rocio, @origen, @usuario
    );
  `;
  }
  return `
    INSERT INTO ${TABLA_REGISTRO} (
      archivo_hash,
      archivo_nombre,
      codigo_centro_costo,
      fecha_archivo,
      temperatura,
      ${HUMEDAD_RELATIVA_FISICO},
      ${PUNTO_CONDENSACION_FISICO},
      origen_carga,
      usuario_registro
    )
    VALUES (
      @h, @nombre, @codigo,
      @fa, @temp,
      @hr, @rocio,
      @origen, @usuario
    );
  `;
}

/**
 * Registro activo con mismo centro, usuario y misma marca de fecha/hora (precision segundo en BD).
 */
async function buscarIdDuplicadoPorFechaUsuario(connOrTran, fecha, codigoCc, usuarioAlta) {
  if (!fecha || isNaN(fecha.getTime())) {
    return null;
  }
  const res = await new sql.Request(connOrTran)
    .input("codigo", sql.NVarChar(64), codigoCc)
    .input("usuario", sql.NVarChar(128), usuarioAlta)
    .input("fa", sql.DateTime2, fecha)
    .query(`
      SELECT TOP (1) id_registro
      FROM ${TABLA_REGISTRO}
      WHERE estatus = 'A'
        AND codigo_centro_costo = @codigo
        AND usuario_registro = @usuario
        AND fecha_archivo IS NOT NULL
        AND DATEDIFF(SECOND, fecha_archivo, @fa) = 0
      `);
  const row =
    res.recordset && res.recordset[0]
      ? res.recordset[0]
      : null;
  return row != null && row.id_registro != null ? row.id_registro : null;
}

/** Clave estable para repetidos dentro del mismo archivo: segundo Unix + centro + usuario. */
function claveLecturaEnArchivo(codigoCc, usuarioAlta, fechaArchivo) {
  if (
    !fechaArchivo ||
    !(fechaArchivo instanceof Date) ||
    isNaN(fechaArchivo.getTime())
  ) {
    return null;
  }
  return `${String(codigoCc).trim()}\u001f${String(usuarioAlta).trim()}\u001f${Math.floor(fechaArchivo.getTime() / 1000)}`;
}

/**
 * Procesa buffer XLSX: valida centro (CECOS), inserta o reemplaza carga por hash.
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
  const origenCarga = resolverOrigenCarga(opts.origen_carga, "E");

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

  let existingId = null;
  if (!esTablaMinima()) {
    const dup = await new sql.Request(pool)
      .input("h", sql.VarBinary(32), hash)
      .query(`
      SELECT TOP 1 id_registro FROM ${TABLA_REGISTRO}
      WHERE archivo_hash = @h AND estatus = 'A';
    `);
    existingId =
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
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    if (existingId && reemplazar) {
      await new sql.Request(transaction)
        .input("h", sql.VarBinary(32), hash)
        .query(`DELETE FROM ${TABLA_REGISTRO} WHERE archivo_hash = @h;`);
    }

    let guardadas = 0;
    const clavesFechaUsuarioEnArchivo = new Set();
    for (const raw of rows) {
      const fechaArchivo = extraerFechaArchivo(raw);
      let temperatura = extraerTemperatura(raw);
      let humedad = extraerHumedadRelativa(raw);
      let rocio = extraerPuntoCondensacion(raw);

      if (
        esTablaMinima() &&
        (temperatura == null || !Number.isFinite(temperatura))
      ) {
        continue;
      }

      if (esTablaMinima()) {
        const nrm = normalizarHrRocioParaNotNull(humedad, rocio, temperatura);
        humedad = nrm.hr;
        rocio = nrm.rocio;
      }

      const claveArc = claveLecturaEnArchivo(
        codigoCc,
        usuarioAlta,
        fechaArchivo,
      );
      if (claveArc) {
        if (clavesFechaUsuarioEnArchivo.has(claveArc)) {
          const err = new Error(
            'VALIDACION: El archivo contiene más de una fila con la misma fecha y hora y el mismo centro. Corrija o elimine repetidos antes de cargar.',
          );
          throw err;
        }
        const idDup = await buscarIdDuplicadoPorFechaUsuario(
          transaction,
          fechaArchivo,
          codigoCc,
          usuarioAlta,
        );
        if (idDup != null) {
          const cuando = fechaArchivo.toLocaleString("es-MX", {
            dateStyle: "short",
            timeStyle: "medium",
          });
          const err = new Error(
            `VALIDACION: Ya existe una lectura activa con la misma fecha y hora (${cuando}), el mismo usuario y este centro de costo. No se aplicó la carga. Revise el Excel o bien los registros en reportes.`,
          );
          throw err;
        }
        clavesFechaUsuarioEnArchivo.add(claveArc);
      }

      const rq = esTablaMinima()
        ? incluyeOrigenCargaEnInsertMinima()
          ? new sql.Request(transaction)
              .input("codigo", sql.NVarChar(64), codigoCc)
              .input("fa", sql.DateTime2, fechaArchivo)
              .input("temp", sql.Decimal(14, 6), temperatura)
              .input("hr", sql.Decimal(14, 6), humedad)
              .input("rocio", sql.Decimal(14, 6), rocio)
              .input("origen", sql.Char(1), origenCarga)
              .input("usuario", sql.NVarChar(128), usuarioAlta)
          : new sql.Request(transaction)
              .input("codigo", sql.NVarChar(64), codigoCc)
              .input("fa", sql.DateTime2, fechaArchivo)
              .input("temp", sql.Decimal(14, 6), temperatura)
              .input("hr", sql.Decimal(14, 6), humedad)
              .input("rocio", sql.Decimal(14, 6), rocio)
              .input("usuario", sql.NVarChar(128), usuarioAlta)
        : new sql.Request(transaction)
            .input("h", sql.VarBinary(32), hash)
            .input("nombre", sql.NVarChar(400), originalname)
            .input("codigo", sql.NVarChar(64), codigoCc)
            .input("fa", sql.DateTime2, fechaArchivo)
            .input("temp", sql.Decimal(14, 6), temperatura)
            .input("hr", sql.Decimal(14, 6), humedad)
            .input("rocio", sql.Decimal(14, 6), rocio)
            .input("origen", sql.Char(1), origenCarga)
            .input("usuario", sql.NVarChar(128), usuarioAlta);

      await rq.query(sqlInsertLectura());
      guardadas += 1;
    }

    if (guardadas === 0) {
      const err = new Error(
        esTablaMinima()
          ? 'VALIDACION: ninguna fila válida con temperatura numérica para insertar en tabla mínima (revise columna temperatura / hoja "Fecha")'
          : "VALIDACION: No se pudieron guardar lecturas válidas.",
      );
      throw err;
    }

    await transaction.commit();

    return {
      success: true,
      filas_guardadas: guardadas,
      archivo_hash_sha256: hash.toString("hex"),
      origen_carga: origenCarga,
      modo_tabla_minima: esTablaMinima(),
      reemplazo: Boolean(existingId && reemplazar),
      message:
        existingId && reemplazar
          ? "Carga actualizada (archivo duplicado reemplazado)"
          : esTablaMinima()
            ? "Carga registrada correctamente (tabla sin archivo_hash; no se detectan duplicados por archivo)"
            : "Carga registrada correctamente",
    };
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

/**
 * Alta manual: mismas columnas que una fila del Excel (sin archivo).
 */
async function guardarCapturaManual(opts) {
  const origenCarga = resolverOrigenCarga(opts.origen_carga, "M");
  const codigoCc =
    opts.codigo_centro_costo != null
      ? String(opts.codigo_centro_costo).trim()
      : "";
  const usuarioAlta =
    opts.usuario_alta != null ? String(opts.usuario_alta).trim() : "";
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

  let t = opts.temperatura;
  if (typeof t === "string") {
    t = parseFloat(String(t).replace(",", "."));
  }
  const temperatura = typeof t === "number" && Number.isFinite(t) ? t : NaN;
  if (!Number.isFinite(temperatura)) {
    const err = new Error(
      "VALIDACION: temperatura debe ser numérica (ejemplo: 21.5)"
    );
    throw err;
  }

  let hr = opts.humedad_relativa_pct;
  if (hr != null && hr !== "") {
    hr = parseFloat(String(hr).replace(",", "."));
  } else {
    hr = null;
  }
  if (hr != null && !Number.isFinite(hr)) {
    hr = null;
  }

  let rocio = opts.punto_condensacion_c;
  if (rocio != null && rocio !== "") {
    rocio = parseFloat(String(rocio).replace(",", "."));
  } else {
    rocio = null;
  }
  if (rocio != null && !Number.isFinite(rocio)) {
    rocio = null;
  }

  if (esTablaMinima()) {
    const nrm = normalizarHrRocioParaNotNull(hr, rocio, temperatura);
    hr = nrm.hr;
    rocio = nrm.rocio;
  }

  let fechaMedicion = parseFlexibleDate(opts.fecha_medicion);
  if (fechaMedicion == null || isNaN(fechaMedicion.getTime())) {
    fechaMedicion = new Date();
  }

  const fakeHashFirmaManual = crypto
    .createHash("sha256")
    .update(
      `${codigoCc}|${usuarioAlta}|${fechaMedicion.toISOString()}|${temperatura}`,
    )
    .digest("hex");

  const hash = crypto.randomBytes(32);
  const stamp = fechaMedicion.toISOString().replace(/[^\d]/g, "").slice(0, 14);
  const safeUser = usuarioAlta.length > 64 ? usuarioAlta.slice(0, 64) : usuarioAlta;
  const archivoNombreRaw = `MANUAL_${stamp}_${safeUser}`;
  let archivoNombre = archivoNombreRaw.replace(/[^\w.\-+@]/gi, "_");
  if (archivoNombre.length > 400) {
    archivoNombre = archivoNombre.slice(0, 400);
  }

  const pool = await sql.connect(config);

  const idDupManual = await buscarIdDuplicadoPorFechaUsuario(
    pool,
    fechaMedicion,
    codigoCc,
    usuarioAlta,
  );
  if (idDupManual != null) {
    const cuando = fechaMedicion.toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "medium",
    });
    const err = new Error(
      `VALIDACION: Ya hay un registro activo para esa fecha y hora (${cuando}), mismo usuario y centro. Elija otro momento o revise en reportes.`,
    );
    throw err;
  }

  const reqBase = esTablaMinima()
    ? incluyeOrigenCargaEnInsertMinima()
      ? new sql.Request(pool)
          .input("codigo", sql.NVarChar(64), codigoCc)
          .input("fa", sql.DateTime2, fechaMedicion)
          .input("temp", sql.Decimal(14, 6), temperatura)
          .input("hr", sql.Decimal(14, 6), hr)
          .input("rocio", sql.Decimal(14, 6), rocio)
          .input("origen", sql.Char(1), origenCarga)
          .input("usuario", sql.NVarChar(128), usuarioAlta)
      : new sql.Request(pool)
          .input("codigo", sql.NVarChar(64), codigoCc)
          .input("fa", sql.DateTime2, fechaMedicion)
          .input("temp", sql.Decimal(14, 6), temperatura)
          .input("hr", sql.Decimal(14, 6), hr)
          .input("rocio", sql.Decimal(14, 6), rocio)
          .input("usuario", sql.NVarChar(128), usuarioAlta)
    : new sql.Request(pool)
        .input("h", sql.VarBinary(32), hash)
        .input("nombre", sql.NVarChar(400), archivoNombre)
        .input("codigo", sql.NVarChar(64), codigoCc)
        .input("fa", sql.DateTime2, fechaMedicion)
        .input("temp", sql.Decimal(14, 6), temperatura)
        .input("hr", sql.Decimal(14, 6), hr)
        .input("rocio", sql.Decimal(14, 6), rocio)
        .input("origen", sql.Char(1), origenCarga)
        .input("usuario", sql.NVarChar(128), usuarioAlta);

  await reqBase.query(sqlInsertLectura());

  return {
    success: true,
    filas_guardadas: 1,
    origen_carga: origenCarga,
    archivo_hash_sha256: esTablaMinima()
      ? fakeHashFirmaManual
      : hash.toString("hex"),
    reemplazo: false,
    modo_tabla_minima: esTablaMinima(),
    message: "Carga registrada correctamente",
  };
}

module.exports = {
  procesarCargaArchivo,
  guardarCapturaManual,
  excelSerialToDate,
  parseFlexibleDate,
};
