const sql = require("mssql");
const config = require("../../dbconfig");

const getHistorialViaticos = async (req, res) => {
  console.log("📥 getHistorialViaticos - Parámetros recibidos:", req);
  try {
    const permisos = Array.isArray(req.permisos) ? req.permisos : [];
    const esAdminCXP =
      permisos.includes("CUENTASXPAGAR") || permisos.includes("CUENTASXPAGAR2");

    const pool = await sql.connect(config);
    const request = pool.request();

    let query = `
              SELECT 
    v.id_solicitud, 
    v.folio, 
    v.fecha_creacion AS fecha, 
    v.motivo, 
    v.destino, 
    v.tipo_flujo, 
    v.estatus_general, 
    v.monto_solicitado,
    v.valida_compras,
    v.valida_cxp,
    ISNULL(STUFF((
        SELECT '|' + s.servicio_nombre + ':' + s.estatus_servicio
        FROM tb_wap_Soliviaticos_Servicios s 
        WHERE s.id_solicitud = v.id_solicitud 
        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, ''), '') AS servicios_raw
FROM tb_wap_Soliviaticos_reg_01 v
WHERE v.fecha_creacion BETWEEN @fechaDesde AND @fechaHasta
        `;

    if (esAdminCXP == false) {
      query += ` AND v.id_usuario = @id_usuario`;
      request.input("id_usuario", sql.Int, req.id_usuario);
    }

    query += ` ORDER BY v.fecha_creacion DESC`;

    const result = await request
      .input("fechaDesde", sql.Date, req.fechaDesde)
      .input("fechaHasta", sql.Date, req.fechaHasta)
      .query(query);

    return result.recordset;
  } catch (err) {
    console.log({ error: err.message });
    return { error: err.message };
  }
};

const getHistorialSubordinados = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    const query = `
            WITH JerarquiaDescendente AS (
                SELECT ID_Empleado, 0 as Nivel
                FROM TempusGEC_Pruebas.dbo.empleado
                WHERE ID_Empleado = @id_jefe
                UNION ALL
                SELECT e.ID_Empleado, jd.Nivel + 1
                FROM TempusGEC_Pruebas.dbo.empleado e
                INNER JOIN JerarquiaDescendente jd ON e.ID_JefeDirecto = jd.ID_Empleado
                WHERE e.Estatus = 'A'
            )
            SELECT 
                v.id_solicitud, 
                v.folio, 
                v.fecha_creacion AS fecha, 
                v.motivo, 
                v.destino, 
                v.tipo_flujo, 
                v.estatus_general, 
                v.monto_solicitado,
                v.valida_compras,
                v.valida_cxp,
                emp.Nombre + ' ' + emp.ApellidoPaterno as nombre_solicitante,
                emp.ID_Empleado as id_solicitante,
                ISNULL(STUFF((
                    SELECT '|' + s.servicio_nombre + ':' + s.estatus_servicio
                    FROM tb_wap_Soliviaticos_Servicios s 
                    WHERE s.id_solicitud = v.id_solicitud 
                    FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, ''), '') AS servicios_raw
            FROM tb_wap_Soliviaticos_reg_01 v
            INNER JOIN JerarquiaDescendente jd ON v.id_usuario = jd.ID_Empleado
            INNER JOIN TempusGEC_Pruebas.dbo.empleado emp ON v.id_usuario = emp.ID_Empleado
            WHERE v.fecha_creacion BETWEEN @fechaDesde AND @fechaHasta
              AND v.id_usuario <> @id_jefe
            ORDER BY v.fecha_creacion DESC;
        `;

    const result = await request
      .input("id_jefe", sql.Int, req.id_usuario)
      .input("fechaDesde", sql.Date, req.fechaDesde)
      .input("fechaHasta", sql.Date, req.fechaHasta)
      .query(query);

    return result.recordset;
  } catch (err) {
    console.error("❌ Error en Jerarquía:", err);
    return [];
  }
};

const getViaticosEstatus234 = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    const query = `
            SELECT 
                v.*, 
                v.fecha_creacion AS fecha,
                emp.Nombre AS nombre_empleado, 
                t1.Descripcion AS zona_empleado,
                ev.nombre_archivo,
                ISNULL(STUFF((
                    SELECT '|' + s.servicio_nombre + ':' + s.estatus_servicio
                    FROM GAECTIDB_PRU.dbo.tb_wap_Soliviaticos_Servicios s 
                    WHERE s.id_solicitud = v.id_solicitud 
                    FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, ''), '') AS servicios_raw
            FROM GAECTIDB_PRU.dbo.tb_wap_Soliviaticos_reg_01 v
            LEFT JOIN TempusGEC_Pruebas.dbo.empleado emp ON v.id_usuario = emp.ID_Empleado
            JOIN TempusGEC_Pruebas.dbo.TablaAd01 t1 ON t1.ID_TablaAd01 = emp.ID_TablaAd01
            LEFT JOIN GAECTIDB_PRU.dbo.tb_wap_Solicviaticos_Evidencias ev ON ev.id_solicitud = v.id_solicitud
            WHERE v.estatus_general IN (2, 3, 4)
            ORDER BY v.fecha_creacion DESC;
        `;

    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.error("❌ Error getViaticosEstatus234:", err);
    return [];
  }
};

const getViaticosConfirmacion = async (req, res) => {
  console.log(req);
  try {
    const pool = await sql.connect(config);
    const request = pool.request();

    const zona = String(req.zona || "").trim();

    const query = `
            SELECT
                v.id_solicitud,
                v.folio,
                v.fecha_creacion AS fecha,
                v.tipo_flujo,
                v.motivo,
                v.destino,
                v.estatus_general,
                v.id_usuario,
                CAST(v.id_usuario AS VARCHAR(20)) AS nombre_empleado,
                v.destino AS zona_empleado,
                firma.nombre_archivo AS id_drive_firma,
                CONCAT('https://drive.google.com/file/d/', firma.nombre_archivo, '/view') AS url_firma
            FROM GAECTIDB_PRU.dbo.tb_wap_Soliviaticos_reg_01 v
            OUTER APPLY (
                SELECT TOP 1 ev.nombre_archivo
                FROM GAECTIDB_PRU.dbo.tb_wap_Solicviaticos_Evidencias ev
                WHERE ev.id_solicitud = v.id_solicitud
                ORDER BY ev.fecha_subida DESC, ev.id_evidencia DESC
            ) firma
            WHERE v.estatus_general IN (5, 6)
              AND CAST(v.fecha_creacion AS DATE) BETWEEN @fechaDesde AND @fechaHasta
              AND (@zona = '' OR UPPER(ISNULL(v.destino, '')) LIKE UPPER(@zonaFiltro))
            ORDER BY v.fecha_creacion DESC;
        `;

    const result = await request
      .input("fechaDesde", sql.Date, req.fechaDesde)
      .input("fechaHasta", sql.Date, req.fechaHasta)
      .input("zona", sql.VarChar(150), zona)
      .input("zonaFiltro", sql.VarChar(160), "%" + zona + "%")
      .query(query);

    return result.recordset;
  } catch (err) {
    console.error("Error getViaticosConfirmacion:", err);
    throw err;
  }
};

module.exports = {
  getHistorialViaticos,
  getHistorialSubordinados,
  getViaticosEstatus234,
  getViaticosConfirmacion,
};
