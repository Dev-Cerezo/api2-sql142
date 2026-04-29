const sql = require("mssql");
const config = require("../../dbconfig");

const REG_EMP = /^\d{5,6}$/;

function validarYNormalizarNumsEmpleadosViatico(campo) {
  if (campo == null) {
    return { ok: true, numPersonas: 1, normalizado: null, ids: [] };
  }
  const raw = String(campo).trim();
  if (raw === "") {
    return { ok: true, numPersonas: 1, normalizado: null, ids: [] };
  }
  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  const invalido = tokens.find((t) => !REG_EMP.test(t));
  if (invalido !== undefined) {
    return {
      ok: false,
      error: "Cada número de empleado debe tener 5 o 6 dígitos, solo numéricos.",
    };
  }
  const unicos = [...new Set(tokens)];
  return {
    ok: true,
    numPersonas: unicos.length,
    normalizado: unicos.join(", "),
    ids: unicos,
  };
}

const addSolicitudViaticos = async (req, res) => {
  const rawCampo = req.nums_empleados_viatico ?? req.empleados_participantes;
  const vEmp = validarYNormalizarNumsEmpleadosViatico(rawCampo);
  if (!vEmp.ok) {
    const err = new Error(`VALIDACION: ${vEmp.error}`);
    throw err;
  }

  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const resultPadre = await new sql.Request(transaction)
      .input("id_usuario", sql.Int, req.id_usuario)
      .input("tipo_flujo", sql.VarChar(20), req.tipo_flujo)
      .input("destino", sql.NVarChar(150), req.destino)
      .input("fecha_nacimiento", sql.Date, req.fecha_nacimiento)
      .input("num_personas", sql.Int, vEmp.numPersonas)
      .input("num_dias", sql.Int, req.num_dias || 1)
      .input("monto_solicitado", sql.Decimal(18, 2), req.monto_solicitado)
      .input("cuenta_bancaria", sql.NVarChar(30), req.cuenta_bancaria)
      .input("motivo", sql.NVarChar(sql.MAX), req.motivo)
      .input("valida_compras", sql.VarChar(20), req.valida_compras)
      .input("usuario_actualizacion", sql.Int, req.id_usuario)
      .input("nums_empleados_viatico", sql.NVarChar(500), vEmp.normalizado)
      .query(`
                INSERT INTO tb_wap_Soliviaticos_reg_01 
                (id_usuario, tipo_flujo, destino, fecha_nacimiento, num_personas, num_dias, 
                 monto_solicitado, cuenta_bancaria, motivo, estatus_general, 
                 valida_compras, valida_cxp, fecha_creacion, fecha_actualizacion, usuario_actualizacion, nums_empleados_viatico)
                VALUES 
                (@id_usuario, @tipo_flujo, @destino, @fecha_nacimiento, @num_personas, @num_dias, 
                 @monto_solicitado, @cuenta_bancaria, @motivo, 1, 
                 @valida_compras, 'Pendiente', GETDATE(), GETDATE(), @usuario_actualizacion, @nums_empleados_viatico);
                
                SELECT SCOPE_IDENTITY() AS id, 
                (SELECT folio FROM tb_wap_Soliviaticos_reg_01 WHERE id_solicitud = SCOPE_IDENTITY()) AS folio;
            `);

    const id_solicitud = resultPadre.recordset[0].id;
    const folio_generado = resultPadre.recordset[0].folio;

    if (req.servicios && req.servicios.length > 0) {
      for (const servicio of req.servicios) {
        await new sql.Request(transaction)
          .input("id_solicitud", sql.Int, id_solicitud)
          .input("servicio_nombre", sql.VarChar(50), servicio.nombre)
          .query(`INSERT INTO tb_wap_Soliviaticos_Servicios (id_solicitud, servicio_nombre, estatus_servicio, fecha_actualizacion)
                            VALUES (@id_solicitud, @servicio_nombre, 'Pendiente', GETDATE())`);
      }
    }

    if (req.tieneEvidencias) {
      await new sql.Request(transaction)
        .input("id_solicitud", sql.Int, id_solicitud)
        .input("temp_name", sql.VarChar(255), id_solicitud.toString())
        .query(`INSERT INTO tb_wap_Solicviaticos_Evidencias (id_solicitud, nombre_archivo, fecha_subida)
                        VALUES (@id_solicitud, @temp_name, GETDATE())`);
    }

    await transaction.commit();
    return { status: "SUCCESS", id: id_solicitud, folio: folio_generado };
  } catch (err) {
    if (transaction) await transaction.rollback();
    throw err;
  }
};

module.exports = {
  addSolicitudViaticos,
};
