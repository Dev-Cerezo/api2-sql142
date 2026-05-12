/**
 * Alta y CRUD administrativo conductores GAEC · ESR.
 * Evidencias: Google Drive — carpeta padre configurable ( por defecto la indicada por negocio ).
 */
const path = require("path");
const fs = require("fs");
const sql = require("mssql");
const multer = require("multer");
const db = require("../../dbconfig");
const { createFolder, uploadFile2 } = require("../../googleDriveConfig");

const DRIVE_PARENT_ID =
  process.env.CONDUCTORES_DRIVE_PARENT_ID ||
  "1AmRFqBJJbd3Pp3gHEu1BCMloJePU9dDg";

const CAMPOS_ARCHIVO = ["licFrente", "licReverso", "ineFrente", "ineReverso"];

/** Nombre de tabla en SQL Server (convención WAP). */
const TABLE_CONDUCTORES = "dbo.tb_wap_conductoresr_reg_01";
const UQ_NO_EMP_ACTIVO = "UQ_tb_wap_conductoresr_reg_01_no_emp_activo";

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname) || "";
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  },
});

/** @type {import('express').RequestHandler & { (): import('express').RequestHandler }} */
const multerConductoresCampos = multer({
  storage: diskStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
}).fields(
  CAMPOS_ARCHIVO.map((nombre) => ({ name: nombre, maxCount: 1 }))
);

function usuarioRequest(req) {
  const u = req.headers["x-usuario"] || req.headers["x-user"] || req.body.usuario_alta;
  const s = u != null ? String(u).trim() : "";
  return s || "sistema_gaec";
}

function webLink(fileId) {
  return fileId ? `https://drive.google.com/file/d/${fileId}/view` : "";
}

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {
    /* ignore */
  }
}

/** Libera archivos ya escritos en disco por multer si abortamos antes de Drive/SQL. */
function cleanupMultipartFiles(filesPorCampo) {
  if (!filesPorCampo || typeof filesPorCampo !== "object") return;
  for (const campo of CAMPOS_ARCHIVO) {
    const arr = filesPorCampo[campo];
    const f = arr && arr[0];
    if (!f) continue;
    const fp =
      typeof f.path === "string" && f.path
        ? f.path
        : path.join(uploadsDir, f.filename || "");
    safeUnlink(fp);
  }
}

function parseEvidenciasJson(raw) {
  if (!raw || typeof raw !== "string") return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

/** Fila activa en SQL — tolera espacios / mayúsculas en CHAR/VARCHAR. */
const SQL_FILTRO_ACTIVO = `UPPER(LTRIM(RTRIM(CAST(estatus AS NVARCHAR(10))))) = N'A'`;

/**
 * tedious/mssql puede devolver claves tipo `no_empleado` o `No_Empleado`; el front usa snake_case.
 */
function mapConductorRow(row) {
  if (!row || typeof row !== "object") return row;
  const keys = Object.keys(row);
  const norm = (s) => String(s || "").toLowerCase().replace(/_/g, "");
  const get = (logical) => {
    const nw = norm(logical);
    const k = keys.find((x) => norm(x) === nw);
    return k !== undefined ? row[k] : undefined;
  };
  return {
    id: get("id"),
    no_empleado: get("no_empleado"),
    nombre_conductor: get("nombre_conductor"),
    contacto_telefono: get("contacto_telefono"),
    drive_folder_id: get("drive_folder_id"),
    evidencias_json: get("evidencias_json"),
    fecha_registro: get("fecha_registro"),
    fecha_actualizacion: get("fecha_actualizacion"),
    estatus: get("estatus"),
    usuario_alta: get("usuario_alta"),
    usuario_actualizacion: get("usuario_actualizacion"),
  };
}

async function subirArchivosADrive(folderId, filesPorCampo, uploadDirResolved) {
  const evidencias = [];
  if (!folderId || !filesPorCampo) return evidencias;

  for (const campo of CAMPOS_ARCHIVO) {
    const arr = filesPorCampo[campo];
    const f = arr && arr[0];
    if (!f) continue;
    const fp = path.join(uploadDirResolved, f.filename);
    try {
      const data = await uploadFile2(fp, folderId);
      evidencias.push({
        campo,
        fileId: data.id,
        fileName: f.originalname || path.basename(fp),
        webViewLink: data.webViewLink || webLink(data.id),
      });
    } finally {
      safeUnlink(fp);
    }
  }
  return evidencias;
}

function mergearEvidencias(existentes, nuevasPorCampo) {
  const byCampo = new Map(existentes.map((e) => [e.campo, e]));
  for (const n of nuevasPorCampo) {
    byCampo.set(n.campo, n);
  }
  return CAMPOS_ARCHIVO.map((c) => byCampo.get(c)).filter(Boolean);
}

async function eliminarDbPorId(pool, id) {
  await pool.request().input("id", sql.Int, id).query(
    `DELETE FROM ${TABLE_CONDUCTORES} WHERE id = @id`
  );
}

/**
 * ¿Hay ya un conductor activo con este no_empleado? (alinea con UQ filtrado por estatus = A).
 * @param {import('mssql').ConnectionPool} pool
 * @param {string} noEmp — ya normalizado trim en caller
 * @param {number|null} excludeId — en UPDATE, ignorar la fila actual
 */
async function existeNoEmpleadoActivo(pool, noEmp, excludeId = null) {
  const req = pool
    .request()
    .input("no_empleado", sql.NVarChar(32), noEmp);
  let q =
    `SELECT TOP (1) id FROM ${TABLE_CONDUCTORES}
     WHERE ${SQL_FILTRO_ACTIVO}
       AND LTRIM(RTRIM(no_empleado)) = LTRIM(RTRIM(@no_empleado))`;
  if (excludeId != null && Number.isFinite(excludeId)) {
    req.input("exclude_id", sql.Int, excludeId);
    q += " AND id <> @exclude_id";
  }
  const result = await req.query(q);
  return Array.isArray(result.recordset) && result.recordset.length > 0;
}

async function listar(req, res) {
  try {
    const incluirBajas = String(req.query.incluir_bajas || "").toLowerCase();
    const todas = incluirBajas === "1" || incluirBajas === "true";

    const pool = await sql.connect(db);
    const result = await pool.request().query(
      todas
        ? `SELECT id, no_empleado, nombre_conductor, contacto_telefono, drive_folder_id, evidencias_json,
              fecha_registro, fecha_actualizacion, estatus, usuario_alta, usuario_actualizacion
           FROM ${TABLE_CONDUCTORES} ORDER BY id DESC`
        : `SELECT id, no_empleado, nombre_conductor, contacto_telefono, drive_folder_id, evidencias_json,
              fecha_registro, fecha_actualizacion, estatus, usuario_alta, usuario_actualizacion
           FROM ${TABLE_CONDUCTORES} WHERE ${SQL_FILTRO_ACTIVO} ORDER BY id DESC`
    );
    const rows = Array.isArray(result.recordset) ? result.recordset : [];
    res.status(200).json({ datos: rows.map(mapConductorRow) });
  } catch (e) {
    console.error("[conductores:listar]", e);
    res.status(500).json({ mensaje: e.message || "Error al listar" });
  }
}

/**
 * GET /conductores/exists?no=12345 — consulta ligera (sin archivos) antes del alta.
 * Debe declararse en rutas ANTES de GET /:id.
 */
async function existeQuery(req, res) {
  try {
    const raw =
      req.query.no != null
        ? String(req.query.no)
        : req.query.no_empleado != null
          ? String(req.query.no_empleado)
          : "";
    const noEmp = raw.trim();
    if (!noEmp) {
      return res.status(400).json({
        mensaje: "Indique el número de empleado (query no o no_empleado).",
      });
    }
    const pool = await sql.connect(db);
    const dup = await existeNoEmpleadoActivo(pool, noEmp, null);
    return res.status(200).json({ existe: dup });
  } catch (e) {
    console.error("[conductores:exists]", e);
    return res.status(500).json({ mensaje: e.message || "Error al verificar" });
  }
}

async function obtener(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }
    const pool = await sql.connect(db);
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        `SELECT * FROM ${TABLE_CONDUCTORES} WHERE id = @id`
      );
    if (!result.recordset.length) {
      return res.status(404).json({ mensaje: "Registro no encontrado" });
    }
    res.status(200).json({ registro: mapConductorRow(result.recordset[0]) });
  } catch (e) {
    console.error("[conductores:obtener]", e);
    res.status(500).json({ mensaje: e.message || "Error al obtener" });
  }
}

async function crear(req, res) {
  const noEmp =
    req.body.noEmpleado != null ? String(req.body.noEmpleado).trim() : "";
  const nombre =
    req.body.nombreConductor != null ? String(req.body.nombreConductor).trim() : "";
  const tel =
    req.body.contactoTel != null ? String(req.body.contactoTel).trim() : "";
  const usuario = usuarioRequest(req);

  if (!noEmp || !nombre || !tel) {
    return res.status(400).json({
      mensaje: "Campos obligatorios: noEmpleado, nombreConductor, contactoTel.",
    });
  }

  const f = req.files || {};
  for (const c of CAMPOS_ARCHIVO) {
    if (!f[c] || !f[c][0]) {
      return res.status(400).json({
        mensaje:
          `Faltan archivos (${CAMPOS_ARCHIVO.join(", ")}). ` +
          "Debe adjuntar los cuatro: licencia e INE, frente y reverso.",
      });
    }
  }

  let pool;
  let idInsertado;

  try {
    pool = await sql.connect(db);

    if (await existeNoEmpleadoActivo(pool, noEmp, null)) {
      cleanupMultipartFiles(f);
      return res.status(409).json({
        mensaje:
          "Ya existe un conductor activo con ese número de empleado. Use otro número o revise el listado.",
      });
    }

    const insert = await pool
      .request()
      .input("no_empleado", sql.NVarChar(32), noEmp)
      .input("nombre_conductor", sql.NVarChar(200), nombre)
      .input("contacto_telefono", sql.NVarChar(40), tel)
      .input("usuario_alta", sql.NVarChar(256), usuario)
      .query(
        `INSERT INTO ${TABLE_CONDUCTORES} (
           no_empleado, nombre_conductor, contacto_telefono,
           fecha_registro, fecha_actualizacion, estatus, usuario_alta
         )
         OUTPUT INSERTED.id AS id
         VALUES (
           @no_empleado, @nombre_conductor, @contacto_telefono,
           SYSUTCDATETIME(), SYSUTCDATETIME(), 'A', @usuario_alta
         )`
      );

    idInsertado = insert.recordset[0].id;

    let folderId;
    try {
      folderId = await createFolder(String(idInsertado), DRIVE_PARENT_ID);
    } catch (eDriveFolder) {
      await eliminarDbPorId(pool, idInsertado);
      throw new Error(`Drive (carpeta): ${eDriveFolder.message}`);
    }

    let evidencias;
    try {
      evidencias = await subirArchivosADrive(folderId, f, uploadsDir);
      if (evidencias.length !== CAMPOS_ARCHIVO.length) {
        throw new Error("No se subieron los cuatro archivos a Drive.");
      }
    } catch (eUp) {
      await eliminarDbPorId(pool, idInsertado);
      throw new Error(`Drive (archivos): ${eUp.message}`);
    }

    const jsonEv = JSON.stringify(evidencias);
    await pool
      .request()
      .input("id", sql.Int, idInsertado)
      .input("drive_folder_id", sql.NVarChar(128), folderId)
      .input("evidencias_json", sql.NVarChar(sql.MAX), jsonEv)
      .query(
        `UPDATE ${TABLE_CONDUCTORES} SET
           drive_folder_id = @drive_folder_id,
           evidencias_json = @evidencias_json,
           fecha_actualizacion = SYSUTCDATETIME()
         WHERE id = @id`
      );

    res.status(201).json({
      ok: true,
      id: idInsertado,
      drive_folder_id: folderId,
      evidencias,
    });
  } catch (e) {
    const msgRaw = String(e.message || "");
    if (msgRaw.includes(UQ_NO_EMP_ACTIVO) || e.number === 2627) {
      cleanupMultipartFiles(f);
      return res.status(409).json({
        mensaje: "Ya existe un conductor activo con ese número de empleado.",
      });
    }
    console.error("[conductores:crear]", e);
    res.status(500).json({ mensaje: msgRaw || "Error al crear registro." });
  }
}

async function actualizar(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  const noEmp =
    req.body.noEmpleado != null ? String(req.body.noEmpleado).trim() : "";
  const nombre =
    req.body.nombreConductor != null ? String(req.body.nombreConductor).trim() : "";
  const tel =
    req.body.contactoTel != null ? String(req.body.contactoTel).trim() : "";
  const usuario = usuarioRequest(req);

  if (!noEmp || !nombre || !tel) {
    return res.status(400).json({
      mensaje: "Campos obligatorios: noEmpleado, nombreConductor, contactoTel.",
    });
  }

  try {
    const pool = await sql.connect(db);

    if (await existeNoEmpleadoActivo(pool, noEmp, id)) {
      cleanupMultipartFiles(req.files || {});
      return res.status(409).json({
        mensaje:
          "Ya existe otro conductor activo con ese número de empleado. Corrija el número o deje el actual.",
      });
    }

    const existe = await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        `SELECT drive_folder_id, evidencias_json FROM ${TABLE_CONDUCTORES} WHERE id = @id AND ${SQL_FILTRO_ACTIVO}`
      );

    if (!existe.recordset.length) {
      return res.status(404).json({ mensaje: "Registro activo no encontrado." });
    }

    const row0 = mapConductorRow(existe.recordset[0]);
    let folderId = row0.drive_folder_id;
    let evJson = row0.evidencias_json;
    if (!folderId) {
      folderId = await createFolder(String(id), DRIVE_PARENT_ID);
      await pool
        .request()
        .input("id", sql.Int, id)
        .input("drive_folder_id", sql.NVarChar(128), folderId)
        .query(
          `UPDATE ${TABLE_CONDUCTORES} SET drive_folder_id = @drive_folder_id, fecha_actualizacion = SYSUTCDATETIME() WHERE id = @id`
        );
    }

    const archivoRecibidos = req.files || {};
    const algunArchivo = CAMPOS_ARCHIVO.some(
      (c) => archivoRecibidos[c] && archivoRecibidos[c][0]
    );

    let jsonCombinado;
    if (!algunArchivo) {
      jsonCombinado = evJson || null;
    } else {
      const parcial = {};
      for (const c of CAMPOS_ARCHIVO) {
        if (archivoRecibidos[c]?.[0]) parcial[c] = archivoRecibidos[c];
      }
      const nuevasEvid = await subirArchivosADrive(folderId, parcial, uploadsDir);
      const anteriores = parseEvidenciasJson(evJson);
      const combinado = mergearEvidencias(anteriores, nuevasEvid);

      if (combinado.length < CAMPOS_ARCHIVO.length) {
        return res.status(400).json({
          mensaje:
            "Tras este cambio deben quedar los cuatro documentos definidos en Drive " +
            "(sube los archivos faltantes o conserva evidencias válidas previas).",
        });
      }
      jsonCombinado = JSON.stringify(combinado);
    }

    await pool
      .request()
      .input("id", sql.Int, id)
      .input("no_empleado", sql.NVarChar(32), noEmp)
      .input("nombre_conductor", sql.NVarChar(200), nombre)
      .input("contacto_telefono", sql.NVarChar(40), tel)
      .input("evidencias_json", sql.NVarChar(sql.MAX), jsonCombinado)
      .input("usuario_actualizacion", sql.NVarChar(256), usuario)
      .query(
        `UPDATE ${TABLE_CONDUCTORES} SET
           no_empleado = @no_empleado,
           nombre_conductor = @nombre_conductor,
           contacto_telefono = @contacto_telefono,
           evidencias_json = @evidencias_json,
           fecha_actualizacion = SYSUTCDATETIME(),
           usuario_actualizacion = @usuario_actualizacion
         WHERE id = @id AND ${SQL_FILTRO_ACTIVO}`
      );

    res.status(200).json({
      ok: true,
      id,
      evidencias_actualizadas: algunArchivo,
    });
  } catch (e) {
    if (String(e.message || "").includes(UQ_NO_EMP_ACTIVO) || e.number === 2627) {
      cleanupMultipartFiles(req.files || {});
      return res.status(409).json({
        mensaje: "Ya existe otro conductor activo con ese número de empleado.",
      });
    }
    console.error("[conductores:actualizar]", e);
    res.status(500).json({ mensaje: e.message || "Error al actualizar" });
  }
}

async function eliminar(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }
    const usuario = usuarioRequest(req);

    const pool = await sql.connect(db);
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("usuario_actualizacion", sql.NVarChar(256), usuario)
      .query(
        `UPDATE ${TABLE_CONDUCTORES} SET
           estatus = 'I',
           fecha_actualizacion = SYSUTCDATETIME(),
           usuario_actualizacion = @usuario_actualizacion
         WHERE id = @id AND ${SQL_FILTRO_ACTIVO};`
      );

    const afectadas =
      typeof result.rowsAffected !== "undefined" ? result.rowsAffected[0] : null;
    if (!afectadas) {
      return res.status(404).json({ mensaje: "Registro activo no encontrado." });
    }

    res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("[conductores:eliminar]", e);
    res.status(500).json({ mensaje: e.message || "Error al dar de baja" });
  }
}

module.exports = {
  multerConductoresCampos,
  listar,
  existeQuery,
  obtener,
  crear,
  actualizar,
  eliminar,
};
