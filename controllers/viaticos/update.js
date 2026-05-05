const sql = require("mssql");
const config = require("../../dbconfig");

const vincularDrive = async (req) => {
  try {
    const pool = await sql.connect(config);
    /** Firma gerente u otra evidencia adicional: nueva fila (no pisar carpeta/expediente). */
    if (req.tipo_evidencia === "FIRMA_GERENTE_VISITA") {
      const ins = await pool
        .request()
        .input("id_solicitud", sql.Int, req.id_solicitud)
        .input("id_drive", sql.VarChar(255), req.id_drive)
        .query(`
                INSERT INTO tb_wap_Solicviaticos_Evidencias (id_solicitud, nombre_archivo, fecha_subida)
                VALUES (@id_solicitud, @id_drive, GETDATE());
            `);
      return {
        status: "success",
        message: "Firma vinculada al expediente (nueva evidencia).",
        rowsAffected: ins.rowsAffected[0],
      };
    }

    const result = await pool
      .request()
      .input("id_solicitud", sql.Int, req.id_solicitud)
      .input("id_drive", sql.VarChar(255), req.id_drive)
      .query(`
                UPDATE tb_wap_Solicviaticos_Evidencias 
                SET nombre_archivo = @id_drive 
                WHERE id_solicitud = @id_solicitud
            `);

    return {
      status: "success",
      message: "Vínculo con Drive establecido correctamente",
      rowsAffected: result.rowsAffected[0],
    };
  } catch (err) {
    console.error("Error en vincularDrive:", err);
    throw err;
  }
};

const updateEstatusGerente = async (req) => {
  if (!req.id_solicitud || req.id_aprobador === undefined) {
    const e = new Error("ID de solicitud e ID de aprobador son requeridos.");
    e.statusCode = 400;
    throw e;
  }

  try {
    const pool = await sql.connect(config);
    const estatusFinal = req.estatus_nuevo === 5 ? 0 : 2;
    const comentarioFinal = req.estatus_nuevo === 2 ? "Adelante" : (req.comentario || "Sin motivo especificado");

    const result = await pool
      .request()
      .input("id", sql.Int, req.id_solicitud)
      .input("estatus", sql.Int, req.estatus_nuevo)
      .input("comentario", sql.VarChar, comentarioFinal)
      .input("id_jefe", sql.Int, req.id_aprobador)
      .query(`
            UPDATE tb_wap_Soliviaticos_reg_01
            SET 
                estatus_general = @estatus,
                comentario_jefe = @comentario,
                usuario_actualizacion = @id_jefe,
                fecha_actualizacion = GETDATE()
            WHERE id_solicitud = @id;
        `);

    if (result.rowsAffected[0] === 0) {
      const e = new Error("No se encontró la solicitud.");
      e.statusCode = 404;
      throw e;
    }

    return {
      success: true,
      mensaje: estatusFinal === 2 ? "Solicitud Aprobada (Estatus 2)" : "Solicitud Rechazada (Estatus 0)",
    };
  } catch (err) {
    if (err.statusCode) throw err;
    console.error("❌ Error en updateEstatusGerente:", err);
    throw err;
  }
};

const updateEstatusOperativo = async (req) => {
  const { id_solicitud, departamento, usuario_actualizacion, estatus_nuevo, comentario } = req;
  try {
    const pool = await sql.connect(config);

    if (departamento === "GERENTE" && Number(estatus_nuevo) === 6) {
      const comTxt =
        comentario == null
          ? null
          : String(comentario).trim() === ""
            ? null
            : String(comentario).trim().slice(0, 500);
      const resultGerente = await pool
        .request()
        .input("id", sql.Int, id_solicitud)
        .input("usuario", sql.Int, usuario_actualizacion)
        .input("comentario", sql.VarChar(500), comTxt)
        .query(
          `
                    UPDATE tb_wap_Soliviaticos_reg_01
                    SET estatus_general = 6,
                        comentario_jefe = COALESCE(@comentario, comentario_jefe),
                        fecha_actualizacion = GETDATE(),
                        usuario_actualizacion = @usuario
                    WHERE id_solicitud = @id AND estatus_general = 5
                `
        );

      if (resultGerente.rowsAffected[0] === 0) {
        const e = new Error(
          "No se actualizó el registro: verifique que el folio exista y esté en estatus 5 (pendiente de firma de gerente)."
        );
        e.statusCode = 409;
        throw e;
      }

      return {
        status: "success",
        message: "Visto bueno de gerente registrado. Estatus actualizado a 6.",
      };
    }

    if (String(departamento).toUpperCase() === "CXP2" && Number(estatus_nuevo) === 5) {
      await pool
        .request()
        .input("id", sql.Int, id_solicitud)
        .input("usuario", sql.Int, usuario_actualizacion)
        .query(
          `
                    UPDATE tb_wap_Soliviaticos_reg_01
                    SET estatus_general = 5,
                        valida_cxp = 'Finalizado',
                        fecha_actualizacion = GETDATE(),
                        usuario_actualizacion = @usuario
                    WHERE id_solicitud = @id
                `
        );

      return {
        status: "success",
        message: "Visto bueno CXP2 registrado. Estatus general actualizado a 5.",
      };
    }

    const columnaValidacion = departamento === "COMPRAS" ? "valida_compras" : "valida_cxp";

    await pool
      .request()
      .input("id", sql.Int, id_solicitud)
      .input("usuario", sql.Int, usuario_actualizacion)
      .query(`
                UPDATE tb_wap_Soliviaticos_reg_01 
                SET ${columnaValidacion} = 'Finalizado',
                    fecha_actualizacion = GETDATE(),
                    usuario_actualizacion = @usuario
                WHERE id_solicitud = @id
            `);

    const checkStatus = await pool
      .request()
      .input("id", sql.Int, id_solicitud)
      .query(`
                SELECT valida_compras, valida_cxp 
                FROM tb_wap_Soliviaticos_reg_01 
                WHERE id_solicitud = @id
            `);

    const registro = checkStatus.recordset[0];
    const comprasListo = registro.valida_compras === "Finalizado" || registro.valida_compras === "N/A";
    const cxpListo = registro.valida_cxp === "Finalizado";

    if (comprasListo && cxpListo) {
      await pool
        .request()
        .input("id", sql.Int, id_solicitud)
        .query(`
                    UPDATE tb_wap_Soliviaticos_reg_01 
                    SET estatus_general = 3 
                    WHERE id_solicitud = @id
                `);

      return {
        status: "success",
        message: "Validación finalizada y registro actualizado a Estatus 3 (Recursos Listos).",
      };
    }

    return {
      status: "success",
      message: `Validación de ${departamento} registrada. Esperando al otro departamento.`,
    };
  } catch (err) {
    console.error("❌ Error en updateEstatusOperativo:", err);
    throw err;
  }
};

const updateEstatusComprobacion = async (params) => {
  try {
    const { id_solicitud, nuevo_estatus } = params;
    const pool = await sql.connect(config);

    await pool
      .request()
      .input("id", sql.Int, id_solicitud)
      .input("estatus", sql.Int, nuevo_estatus)
      .query(`
                UPDATE tb_wap_Soliviaticos_reg_01 
                SET estatus_general = @estatus,
                    fecha_actualizacion = GETDATE()
                WHERE id_solicitud = @id
            `);

    return { success: true, message: "Estatus actualizado a 4" };
  } catch (err) {
    console.error("Error en updateEstatusComprobacion:", err);
    throw err;
  }
};

module.exports = {
  vincularDrive,
  updateEstatusGerente,
  updateEstatusOperativo,
  updateEstatusComprobacion,
};
