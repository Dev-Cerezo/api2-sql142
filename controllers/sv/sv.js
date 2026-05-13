const path = require('path')
const fs = require("fs");
var config = require("../../dbconfig"); //Instanciamos el archivo dbconfig
const sql = require("mssql"); //Se necesita paquete mssql
const requireSvRole = require("../middlaware/requireSvRole");

async function getMacroproceso() {
    try {
      let pool = await sql.connect(config);
      let macroproceso = await pool
        .request()
        .query(
            "SELECT ID, fecha, desc1, lider, estatus, fecha_actualizacion, usuario"+
            " FROM tb_wap_rmacroproceso_reg_01 ORDER BY desc1 ASC;");
      //console.log ('dATOS');
      return macroproceso.recordsets;
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "macroprocesos",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function addMacroproceso(datos) {
    try {
      const pool = await sql.connect(config);
      const macroproceso = await pool
        .request()
        .input("desc1", sql.NVarChar, datos.desc1)
        .input("lider", sql.NVarChar, datos.lider)
        .input("estatus", sql.VarChar, datos.estatus)
        .input("usuario", sql.VarChar, datos.usuario)
        .query(
          "INSERT INTO tb_wap_rmacroproceso_reg_01"+
          "(fecha, desc1, lider, estatus, fecha_actualizacion, usuario)"+
          "VALUES(getdate(), @desc1, @lider, @estatus, getdate(), @usuario); SELECT SCOPE_IDENTITY() AS id;");
      let res_id = macroproceso.recordset[0].id;
      let res = {
        tabla: "tb_wap_rmacroproceso_reg_01",
        status: "CORRECTO",
        mensaje: "Se guardo correctamente",
        id: res_id,
      };
  
      return res;
    } catch (error) {
      let res = {
        tabla: "tb_wap_rmacroproceso_reg_01",
        status: "ERROR",
        mensaje: error.message,
      };
      return res;
    }
  }

  async function addProceso(datos) {
   
    try {
      const pool = await sql.connect(config);
      const proceso = await pool
        .request()
        .input("folio", sql.NVarChar, datos.folio)
        .input("desc1", sql.NVarChar, datos.desc1)
        .input("estatus", sql.VarChar, datos.estatus)
        .input("usuario", sql.VarChar, datos.usuario)
        .query(
          "INSERT INTO tb_wap_rproceso_reg_01"+
          "(folio, desc1, estatus, fecha_actualizacion, usuario)"+
          "VALUES(@folio, @desc1, @estatus, getdate(), @usuario); SELECT SCOPE_IDENTITY() AS id;");
      let res_id = proceso.recordset[0].id;
      let res = {
        tabla: "tb_wap_rproceso_reg_01",
        status: "CORRECTO",
        mensaje: "Se guardo correctamente",
        id: res_id,
      };
  
      return res;
    } catch (error) {
      let res = {
        tabla: "tb_wap_rproceso_reg_01",
        status: "ERROR",
        mensaje: error.message,
      };
      return res;
    }
  }

  async function addProcedimiento(datos) {
   
    try {
      const pool = await sql.connect(config);
      const procedimiento = await pool
        .request()
        .input("prin2", sql.Int, datos.prin2)
        .input("desc1", sql.NVarChar, datos.desc1)
        .input("estatus", sql.VarChar, datos.estatus)
        .input("usuario", sql.VarChar, datos.usuario)
        .query(
          "INSERT INTO tb_wap_rprocedimiento_reg_01"+
          "(prin2, desc1, estatus, fecha_actualizacion, usuario)"+
          "VALUES(@prin2, @desc1, @estatus, getdate(), @usuario); SELECT SCOPE_IDENTITY() AS id;");
      let res_id = procedimiento.recordset[0].id;
      let res = {
        tabla: "tb_wap_rprocedimiento_reg_01",
        status: "CORRECTO",
        mensaje: "Se guardo correctamente",
        id: res_id,
      };
  
      return res;
    } catch (error) {
      let res = {
        tabla: "tb_wap_rprocedimiento_reg_01",
        status: "ERROR",
        mensaje: error.message,
      };
      return res;
    }
  }

  async function getProcesos(folio){
      try {
        let pool = await sql.connect(config);
        let procesos = await pool
        .request()
        .input('folio', folio.folio)
        .query("SELECT ID, folio, desc1, estatus, fecha_actualizacion, usuario"+
        " FROM tb_wap_rproceso_reg_01 where folio = @folio ORDER BY desc1 ASC;");
      
        return procesos.recordsets[0];
        //return ((new Date()).toISOString()).slice(8,10);
    
      } catch (error) {
        
        let res = {
          tabla: "tb_wap_rprocesos_reg_01",
          status: "ERROR",
          mensaje: error.message,
        };
        return res;
    
      }
    }

    async function getProcedimientos(prin2){
        try {
          let pool = await sql.connect(config);
          let procedimientos = await pool
          .request()
          .input('prin2', prin2.prin2)
          .query("SELECT ID, prin2, desc1, estatus, fecha_actualizacion, usuario"+
          " FROM tb_wap_rprocedimiento_reg_01 where prin2 = @prin2 ORDER BY desc1 ASC;");
        
          return procedimientos.recordsets[0];
          //return ((new Date()).toISOString()).slice(8,10);
      
        } catch (error) {
          
          let res = {
            tabla: "tb_wap_rprocedimiento_reg_01",
            status: "ERROR",
            mensaje: error.message,
          };
          return res;
      
        }
      }

      async function getMacrosByDesc(data){
        try {
          let pool = await sql.connect(config);
          let macro = await pool
          .request()
          .input('desc', data.desc) 
          .query("SELECT ISNULL((SELECT TOP 1 ID "+
            "FROM tb_wap_rmacroproceso_reg_01 "+
            "WHERE desc1 = @desc "+
            "ORDER BY ID), -1) AS ID;;");
        
          return macro.recordsets[0][0].ID;
          //return ((new Date()).toISOString()).slice(8,10);
      
        } catch (error) {
          
          let res = {
            tabla: "tb_wap_rmacroproceso_reg_01",
            status: "ERROR",
            mensaje: error.message,
          };
          return res;
      
        }
      }

      async function getProcedimientosByDesc(data){
        try {
          let pool = await sql.connect(config);
          let procedimiento = await pool
          .request()
          .input('desc', data.desc) 
          .query("SELECT ISNULL((SELECT TOP 1 ID "+
            "FROM tb_wap_rprocedimiento_reg_01 "+
            "WHERE desc1 = @desc "+
            "ORDER BY ID), -1) AS ID;");
        
          return procedimiento.recordsets[0][0].ID;
          //return ((new Date()).toISOString()).slice(8,10);
      
        } catch (error) {
          
          let res = {
            tabla: "tb_wap_rprocedimiento_reg_01",
            status: "ERROR",
            mensaje: error.message,
          };
          return res;
      
        }
      }

      async function getProcesoByDesc(data){
        try {
          let pool = await sql.connect(config);
          let proceso = await pool
          .request()
          .input('desc', data.desc) 
          .query("SELECT ISNULL((SELECT TOP 1 ID "+
            "FROM tb_wap_rproceso_reg_01 "+
            "WHERE desc1 = @desc "+
            "ORDER BY ID), -1) AS ID;");
        
          return proceso.recordsets[0][0].ID;
          //return ((new Date()).toISOString()).slice(8,10);
      
        } catch (error) {
          
          let res = {
            tabla: "tb_wap_rproceso_reg_01",
            status: "ERROR",
            mensaje: error.message,
          };
          return res;
      
        }
      }
      
      

      async function addIndicadores(datos) {
        try {
          const pool = await sql.connect(config);
          const altaindicador = await pool
            .request()
            .input("fecha", sql.Date, datos.fecha)
            .input("desc1", sql.NVarChar, datos.desc1)
            .input("macroproceso", sql.Int, datos.macroproceso)
            .input("proceso", sql.Int, datos.proceso)
            .input("procedimiento", sql.Int, datos.procedimiento)
            .input("formula", sql.VarChar, datos.formula)
            .input("fuenteDI", sql.VarChar, datos.fuenteDI)
            .input("notas", sql.NVarChar, datos.notas)
            .input("conversion", sql.VarChar, datos.conversion)
            .input("usuario", sql.VarChar, datos.usuario)
            .query(
              "INSERT INTO tb_wap_rindicador_reg_01 "+
              "(fecha, desc1, macroproceso, proceso, procedimiento, formula, fuenteDI, notas, conversion, fecha_actualización, usuario, estatus, usuarioact) "+
              "VALUES(@fecha, @desc1, @macroproceso, @proceso, @procedimiento, @formula, @fuenteDI, @notas, @conversion, getdate(), @usuario, 0, @usuario); SELECT SCOPE_IDENTITY() AS id;"
            );
          let res_id = altaindicador.recordset[0].id;
          let res = {
            tabla: "tb_wap_rindicador_unidad_reg_01",
            status: "CORRECTO",
            mensaje: "Se guardo correctamente",
            id: res_id,
          };
      
          return res;
        } catch (error) {
          let res = {
            tabla: "tb_wap_rindicador_reg_01",
            status: "ERROR",
            mensaje: error.message,
          };
          return res;
        }
      }

      async function getIndicadores() {
    try {
      let pool = await sql.connect(config);
      let indicador = await pool
        .request()
        .query(`SELECT i.ID idindicador 
        ,i.fecha 
        ,convert(varchar(11),i.fecha,113) as fechaformato 
        ,i.desc1 
        ,i.macroproceso 
        ,i.proceso 
        ,i.procedimiento 
        ,i.formula 
        ,i.fuenteDI 
        ,i.notas 
        ,i.conversion 
        ,i.fecha_actualización 
        ,i.usuario 
        ,i.estatus 
        ,m.desc1 macro 
        ,i.ID idmacro 
        ,p.desc1 proce 
        ,pr.desc1 proced 
		    ,e.ID_JefeDirecto 
        ,e.ID_Empleado 
		    ,d.Descripcion AS departamento 
        FROM tb_wap_rindicador_reg_01 i 
        JOIN tb_wap_rmacroproceso_reg_01 m ON i.macroproceso = m.ID 
        JOIN tb_wap_rproceso_reg_01 p ON p.ID = i.proceso 
        JOIN tb_wap_rprocedimiento_reg_01 pr ON pr.ID = i.procedimiento 
        JOIN TempusGEC.dbo.Empleado e ON e.eMail = i.usuario COLLATE SQL_Latin1_General_CP1_CI_AS 
        JOIN TempusGEC.dbo.Departamento d ON d.ID_Departamento = e.ID_Departamento ORDER BY i.desc1 ASC;`); 
      return indicador.recordsets;
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicador_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  

  async function addIndicadorUsuario(datos) {
    try {
      const pool = await sql.connect(config);
      const altaindicadorusuario = await pool
        .request()
        .input("fecha", sql.Date, datos.fecha)
        .input("usuarioID", sql.Int, datos.usuarioID)
        .input("indicadorID", sql.Int, datos.indicadorID)
        .input("minimo", sql.VarChar, datos.minimo)
        .input("meta", sql.VarChar, datos.meta)
        .input("peso", sql.VarChar, datos.peso)
        .input("notas", sql.VarChar, datos.notas)
        .input("estatus", sql.VarChar, datos.estatus)
        .input("gerente", sql.VarChar, datos.gerente)
        .input("usuario", sql.VarChar, datos.usuario)
        .input("maximo", sql.VarChar, datos.maximo)
        .query(
          "INSERT INTO tb_wap_rindicadorusuario_reg_01 "+
          "(fecha, usuarioID, indicadorID, minimo, meta, peso, notas, estatus, gerente, fecha_actualizacion, usuario, maximo) "+
          "VALUES(@fecha, @usuarioID, @indicadorID, @minimo, @meta, @peso, @notas, @estatus, @gerente, getdate(), @usuario, @maximo); SELECT SCOPE_IDENTITY() AS id;"
        );
      let res_id = altaindicadorusuario.recordset[0].id;
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "CORRECTO",
        mensaje: "Se guardo correctamente",
        id: res_id,
      };
  
      return res;
    } catch (error) {
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: error.message,
      };
      return res;
    }
  }

  async function getUsuarios(query) {
    try {
      query = query || {};
      const soloInd =
        query.soloConIndicadoresSv === "1" ||
        query.soloConIndicadoresSv === "true";
      const qRaw = String(query.q || "").trim();
      let qPart = "";
      let pool = await sql.connect(config);
      let req = pool.request();
      if (qRaw) {
        const like =
          "%" +
          qRaw.replace(/%/g, "").replace(/\[/g, "").replace(/\]/g, "") +
          "%";
        req.input("q", sql.NVarChar, like);
        qPart =
          " AND (e.Nombre LIKE @q OR e.ApellidoPaterno LIKE @q OR e.ApellidoMaterno LIKE @q OR CAST(e.ID_Empleado AS VARCHAR(20)) LIKE @q OR e.eMail LIKE @q)";
      }
      let joins =
        "TempusGEC.dbo.empleado e INNER JOIN " +
        "TempusGEC.dbo.Departamento D ON e.ID_Departamento = d.ID_Departamento INNER JOIN " +
        "TempusGEC.dbo.Puesto p ON e.ID_Puesto = p.ID_Puesto ";
      if (soloInd) {
        joins +=
          "INNER JOIN tb_wap_rindicadorusuario_reg_01 tu ON tu.usuarioID = e.ID_Empleado AND tu.estatus = 1 " +
          "INNER JOIN tb_wap_rindicador_reg_01 ti ON tu.indicadorID = ti.ID AND ti.estatus = 1 ";
      }
      let sqlText =
        "SELECT DISTINCT e.ID_Empleado, e.Nombre, e.ApellidoPaterno, e.ApellidoMaterno, e.eMail, e.Estatus, " +
        "d.Descripcion AS Departamento, p.Descripcion AS Puesto, e.ID_JefeDirecto " +
        "FROM " +
        joins +
        "WHERE e.Estatus = 'A'" +
        qPart +
        " ORDER BY e.Nombre, e.ApellidoPaterno";
      let usuario = await req.query(sqlText);
      return usuario.recordsets;
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rusuario_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function getUsuariosIndicadores(user, query) {
    try {
      query = query || {};
      const rol = user && user.rol;
      const uid =
        user && user.id != null ? parseInt(user.id, 10) : NaN;
      const dept = user && user.dept ? String(user.dept) : "";

      let pool = await sql.connect(config);
      let request = pool.request();
      let extra = "";

      const forUid =
        query.forUsuarioId != null ? parseInt(query.forUsuarioId, 10) : NaN;
      if (user && requireSvRole.esPrivilegioApoyoSv(user)) {
        if (Number.isFinite(forUid)) {
          request.input("scope_uid", sql.Int, forUid);
          extra = " AND tu.usuarioID = @scope_uid";
        } else {
          extra = " AND 1=0";
        }
      } else if (!rol) {
        if (Number.isFinite(uid)) {
          request.input("scope_uid", sql.Int, uid);
          extra = " AND tu.usuarioID = @scope_uid";
        }
      } else if (rol === "usuario") {
        if (Number.isFinite(uid)) {
          request.input("scope_uid", sql.Int, uid);
          extra = " AND tu.usuarioID = @scope_uid";
        }
      } else if (rol === "supervisor") {
        if (Number.isFinite(uid)) {
          request.input("scope_uid", sql.Int, uid);
          extra =
            " AND (tu.usuarioID = @scope_uid OR e1.ID_JefeDirecto = @scope_uid)";
        }
      } else if (rol === "gerente" && dept) {
        request.input("scope_dept", sql.VarChar, dept);
        extra = " AND d.Descripcion = @scope_dept";
      }

      let usuarioind = await request.query(
        `select tu.ID, e1.Nombre, e1.ID_Empleado Noempleado, d.Descripcion Departamento, tu.maximo, e2.ID_Empleado Nogerente, e1.ID_JefeDirecto, tu.usuarioID, ti.estatus, convert(varchar(11),tu.fecha,113) as fecha_formato, tu.meta, tu.minimo, tu.notas, tu.peso, e2.ID_Empleado id_gerente, e2.Nombre gerente, e1.ApellidoPaterno Ap_empleado, e1.ApellidoMaterno Am_empleado, e2.ApellidoPaterno Ap_gerente, e2.ApellidoMaterno Am_gerente, ti.desc1, p.Descripcion Puesto  from tb_wap_rindicadorusuario_reg_01 tu 
        INNER JOIN TempusGEC.dbo.empleado e1 ON tu.usuarioID = e1.ID_Empleado 
        INNER JOIN TempusGEC.dbo.empleado e2 ON tu.gerente = e2.ID_Empleado 
        INNER JOIN tb_wap_rindicador_reg_01 ti ON tu.indicadorID = ti.ID 
        INNER JOIN TempusGEC.dbo.Puesto p ON e1.ID_Puesto = p.ID_Puesto 
        INNER JOIN TempusGEC.dbo.Departamento d ON d.ID_Departamento = e1.ID_Departamento 
        where e1.Estatus = 'A' AND ti.estatus = 1 AND tu.estatus = 1${extra} order by 1`
      );

      return usuarioind.recordsets;
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function getUsuariosIndicadoresAprobar() {
    try {

      let pool = await sql.connect(config);
      let usuarioind = await pool
        .request()
        .query("WITH CTE AS ( "+
            "SELECT "+
                "tu.ID, "+
                "ti.conversion, "+
                "e1.Nombre, "+
                "e1.ID_JefeDirecto, "+
                "e1.ID_Empleado AS Noempleado, "+
                "d.Descripcion AS Departamento, "+
                "e2.ID_Empleado AS Nogerente, "+
                "tu.usuarioID, "+
                "CONVERT(varchar(11), tu.fecha, 113) AS fecha, "+
                "tu.meta, "+
                "tu.minimo, "+
                "tu.maximo, "+
                "tu.peso, "+
                "e2.ID_Empleado AS id_gerente, "+
                "e2.Nombre AS gerente, "+
                "e1.ApellidoPaterno AS Ap_empleado, "+
                "e1.ApellidoMaterno AS Am_empleado, "+
                "e2.ApellidoPaterno AS Ap_gerente, "+
                "e2.ApellidoMaterno AS Am_gerente, "+
                "ti.desc1, "+
                "p.Descripcion AS Puesto, "+
                "te.url, "+
                "tr.resultadoperiodo, "+
                "tr.resultadoponderado, "+
                "tu.ID AS indicadorusuario, "+
                "tr.logroindicador, "+
                "tr.periodo, "+
                "ta.ID AS idaprobacion, "+
                "tr.ID AS idresultado1, "+
                "tr.estatus AS estatusresultado1, "+
                "ROW_NUMBER() OVER (PARTITION BY e1.ID_Empleado ORDER BY e1.ID_Empleado) AS RowNum "+
            "FROM tb_wap_rindicadorusuario_reg_01 tu "+
            "INNER JOIN TempusGEC.dbo.empleado e1 ON tu.usuarioID = e1.ID_Empleado "+
            "INNER JOIN TempusGEC.dbo.empleado e2 ON tu.gerente = e2.ID_Empleado "+
            "INNER JOIN tb_wap_rindicador_reg_01 ti ON tu.indicadorID = ti.ID "+
            "INNER JOIN TempusGEC.dbo.Puesto p ON e1.ID_Puesto = p.ID_Puesto "+
            "INNER JOIN TempusGEC.dbo.Departamento d ON d.ID_Departamento = e1.ID_Departamento "+
            "INNER JOIN tb_wap_rresultados1_reg_01 tr ON tu.ID = tr.indicadorusuario "+
            "INNER JOIN tb_wap_revidencia_reg_01 te ON tr.ID = te.resultadoID "+
            "INNER JOIN tb_wap_raprobacion_reg_01 ta ON ta.ID = tr.aprobacionID "+
            "WHERE e1.Estatus = 'A' ) "+
        "SELECT * FROM CTE WHERE RowNum = 1 "+
        "ORDER BY Nombre ASC; ");

      return usuarioind.recordsets[0];
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function getUsuariosIndicadoresAprobarPerido(data) {
    try {

      let pool = await sql.connect(config);
      let usuarioind = await pool
        .request()
        .input("periodo", sql.VarChar, data.periodo)
        .query(`select tu.ID, ti.conversion, e1.Nombre, e1.ID_Empleado Noempleado, d.Descripcion Departamento,e2.ID_Empleado Nogerente, tu.usuarioID, convert(varchar(11),tu.fecha,113) fecha, tu.meta, tu.minimo, tu.maximo, tu.peso, e2.ID_Empleado id_gerente, e2.Nombre gerente, e1.ApellidoPaterno Ap_empleado, e1.ApellidoMaterno Am_empleado, e2.ApellidoPaterno Ap_gerente, e2.ApellidoMaterno Am_gerente, ti.desc1, p.Descripcion Puesto, te.url , tr.resultadoperiodo, tr.resultadoponderado, tu.ID indicadorusuario, tr.logroindicador, tr.periodo, ta.ID idaprobacion, tr.ID idresultado1, tr.estatus estatusresultado1 
        from tb_wap_rindicadorusuario_reg_01 tu 
        INNER JOIN TempusGEC.dbo.empleado e1 ON tu.usuarioID = e1.ID_Empleado 
        INNER JOIN TempusGEC.dbo.empleado e2 ON tu.gerente = e2.ID_Empleado 
        INNER JOIN tb_wap_rindicador_reg_01 ti ON tu.indicadorID = ti.ID 
        INNER JOIN TempusGEC.dbo.Puesto p ON e1.ID_Puesto = p.ID_Puesto 
        INNER JOIN TempusGEC.dbo.Departamento d ON d.ID_Departamento = e1.ID_Departamento 
        INNER JOIN tb_wap_rresultados1_reg_01 tr on tu.ID = tr.indicadorusuario 
        INNER JOIN tb_wap_revidencia_reg_01 te on tr.ID = te.resultadoID 
        INNER JOIN tb_wap_raprobacion_reg_01 ta on ta.ID = tr.aprobacionID 
        where tr.baja=1 AND tr.estatus = 0 AND e1.Estatus = 'A' AND tr.periodo = @periodo order by 1`);

      return usuarioind.recordsets[0];
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function getUsuariosIndicadoresreportes(data) {
    try {

      let pool = await sql.connect(config);
      let usuarioind = await pool
        .request()
        .input("fechai", sql.Date, data.fechai)
        .input("fechaf", sql.Date, data.fechaf)
        .query(` WITH RecursiveEmployeeHierarchy AS (
    SELECT 
        e1.ID_Empleado, 
        e1.NombreCompleto, 
        e1.ID_JefeDirecto 
    FROM 
        TempusGEC.dbo.empleado e1 
    WHERE 
        e1.ID_JefeDirecto IS NOT NULL
    UNION ALL 
    SELECT 
        e2.ID_Empleado, 
        e2.NombreCompleto, 
        e2.ID_JefeDirecto 
    FROM 
        TempusGEC.dbo.empleado e2 
    INNER JOIN 
        RecursiveEmployeeHierarchy reh ON reh.ID_Empleado = e2.ID_JefeDirecto
)
SELECT DISTINCT
    tu.ID, 
    ti.conversion,  
    e2.NombreCompleto AS nombre_gerente,  
    reh.NombreCompleto AS nombre_empleado, 
    reh.ID_Empleado AS Noempleado, 
    d.Descripcion AS Departamento, 
    rm.desc1 AS Macroproceso, 
    rp.desc1 AS Proceso, 
    rpr.desc1 AS Procedimiento,  
    e2.ID_Empleado AS Nogerente, 
    tu.usuarioID, 
    CONVERT(VARCHAR(11), tr.fecha, 113) AS fecha, 
    tu.meta, 
    tu.minimo, 
    tu.maximo, 
    tu.peso, 
    e2.ID_Empleado AS id_gerente, 
    ti.desc1, 
    CASE
        WHEN ti.estatus = 'false' THEN 'no'
        ELSE 'si'
    END AS ind_activo,
    p.Descripcion AS Puesto, 
    te.url, 
    tr.resultadoperiodo, 
    tr.resultadoponderado, 
    tu.ID AS indicadorusuario, 
    CASE 
        WHEN tu.estatus = '0' THEN 'no' 
        ELSE 'si' 
    END AS asig_activa,
    tr.logroindicador, 
    tr.periodo, 
    ta.ID AS idaprobacion,  
    tr.ID AS idresultado1, 
    tr.estatus AS estatusresultado1,  
    ta.notas AS comentario_resultado,
    t1.Descripcion AS Sucursal 
FROM 
    tb_wap_rindicadorusuario_reg_01 tu 
INNER JOIN 
    TempusGEC.dbo.empleado e1 ON tu.usuarioID = e1.ID_Empleado  
INNER JOIN 
    TempusGEC.dbo.empleado e2 ON tu.gerente = e2.ID_Empleado  
INNER JOIN 
    tb_wap_rindicador_reg_01 ti ON tu.indicadorID = ti.ID  
INNER JOIN 
    tb_wap_rmacroproceso_reg_01 rm ON rm.ID = ti.macroproceso 
INNER JOIN
    tb_wap_rproceso_reg_01 rp ON rp.ID = ti.proceso 
INNER JOIN 
    tb_wap_rprocedimiento_reg_01 rpr ON rpr.ID = ti.procedimiento 
INNER JOIN 
    TempusGEC.dbo.Puesto p ON e1.ID_Puesto = p.ID_Puesto 
INNER JOIN 
    TempusGEC.dbo.Departamento d ON d.ID_Departamento = e1.ID_Departamento 
INNER JOIN 
    tb_wap_rresultados1_reg_01 tr ON tu.ID = tr.indicadorusuario 
INNER JOIN 
    tb_wap_revidencia_reg_01 te ON tr.ID = te.resultadoID 
INNER JOIN 
    tb_wap_raprobacion_reg_01 ta ON ta.ID = tr.aprobacionID 
INNER JOIN 
    TempusGEC.dbo.TablaAd01 t1 ON t1.ID_TablaAd01 = e1.ID_TablaAd01 
INNER JOIN 
    RecursiveEmployeeHierarchy reh ON e1.ID_Empleado = reh.ID_Empleado 
WHERE 
    tr.fecha BETWEEN @fechai AND @fechaf 
    AND e1.Estatus = 'A' 
    AND tr.baja = 1
ORDER BY 
    tu.ID;`);

      return usuarioind.recordsets[0];
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function getUsuariosIndicadoresreportesgerente(data) {
    //console.log(data)
    try {

      let pool = await sql.connect(config);
      let usuarioind = await pool
        .request()
        .input("fechai", sql.Date, data.fechai)
        .input("fechaf", sql.Date, data.fechaf)
        .input("id_gerente", sql.Int, data.idgerente)
        .query(`WITH RecursiveEmployeeHierarchy AS ( SELECT 
              e1.ID_Empleado, 
              e1.NombreCompleto, 
              e1.ID_JefeDirecto 
          FROM 
              TempusGEC.dbo.empleado e1 
          WHERE 
             e1.ID_Empleado = @id_gerente
              UNION ALL 
              SELECT 
              e2.ID_Empleado, 
              e2.NombreCompleto, 
              e2.ID_JefeDirecto 
          FROM 
              TempusGEC.dbo.empleado e2 
          INNER JOIN 
              RecursiveEmployeeHierarchy reh ON reh.ID_Empleado = e2.ID_JefeDirecto) 
              SELECT 
          tu.ID, 
          ti.conversion,  
          e2.NombreCompleto nombre_gerente,  
          reh.NombreCompleto nombre_empleado, 
          reh.ID_Empleado Noempleado, 
          d.Descripcion Departamento, 
          rm.desc1 AS Macroproceso, 
          rp.desc1 AS Proceso, 
          rpr.desc1 AS Procedimiento,  
          e2.ID_Empleado Nogerente, 
          tu.usuarioID, 
          convert(varchar(11),tr.fecha,113) fecha, 
          tu.meta, 
          tu.minimo, 
          tu.maximo, 
          tu.peso, 
          e2.ID_Empleado id_gerente, 
          ti.desc1, 
		    CASE
		  WHEN ti.estatus = 'false' THEN 'no'
		  ELSE 'si'
		  END AS ind_activo,
          p.Descripcion Puesto, 
          te.url, 
          tr.resultadoperiodo, 
          tr.resultadoponderado, 
          tu.ID indicadorusuario, 
		   CASE 
     WHEN tu.estatus = '0' THEN 'no' 
        ELSE 'si' 
    END AS asig_activa,
          tr.logroindicador, 
          tr.periodo, 
          ta.ID idaprobacion,  
          tr.ID idresultado1, 
          tr.estatus estatusresultado1,  
		  ta.notas AS comentario_resultado,
          t1.Descripcion AS Sucursal 
      FROM 
          tb_wap_rindicadorusuario_reg_01 tu 
      INNER JOIN 
          TempusGEC.dbo.empleado e1 ON tu.usuarioID = e1.ID_Empleado  
      INNER JOIN 
          TempusGEC.dbo.empleado e2 ON tu.gerente = e2.ID_Empleado  
      INNER JOIN 
          tb_wap_rindicador_reg_01 ti ON tu.indicadorID = ti.ID  
      INNER JOIN 
          tb_wap_rmacroproceso_reg_01 rm ON rm.ID = ti.macroproceso 
      INNER JOIN
          tb_wap_rproceso_reg_01 rp ON rp.ID = ti.proceso 
      INNER JOIN 
          tb_wap_rprocedimiento_reg_01 rpr ON rpr.ID = ti.procedimiento 
      INNER JOIN 
          TempusGEC.dbo.Puesto p ON e1.ID_Puesto = p.ID_Puesto 
      INNER JOIN 
          TempusGEC.dbo.Departamento d ON d.ID_Departamento = e1.ID_Departamento 
      INNER JOIN 
          tb_wap_rresultados1_reg_01 tr on tu.ID = tr.indicadorusuario 
      INNER JOIN 
          tb_wap_revidencia_reg_01 te on tr.ID = te.resultadoID 
      INNER JOIN 
          tb_wap_raprobacion_reg_01 ta on ta.ID = tr.aprobacionID 
      INNER JOIN 
          TempusGEC.dbo.TablaAd01 t1 ON t1.ID_TablaAd01 = e1.ID_TablaAd01 
      INNER JOIN 
          RecursiveEmployeeHierarchy reh ON e1.ID_Empleado = reh.ID_Empleado 
      WHERE 
          tr.fecha BETWEEN @fechai AND @fechaf 
          AND e1.Estatus = 'A' 
		  AND tr.baja = 1
          AND reh.ID_Empleado IN ( 
              SELECT ID_Empleado 
              FROM RecursiveEmployeeHierarchy) 
      ORDER BY 1;`);

      return usuarioind.recordsets[0];
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }


  async function addResultado1(datos) {
    try {
      const pool = await sql.connect(config);
      const resultado1 = await pool
        .request()
        .input("indicadorusuario", sql.Int, datos.indicadorusuario)
        .input("logroindicador", sql.VarChar, datos.logroindicador)
        .input("resultadometa", sql.VarChar, datos.resultadometa)
        .input("resultadoponderado", sql.Float, datos.resultadoponderado)
        .input("periodo", sql.VarChar, datos.periodo)
        .input("resultadoperiodo", sql.VarChar, datos.resultadoperiodo)
        .input("aprobacionID", sql.Int, datos.aprobacionID)
        .input("estatus", sql.VarChar, datos.estatus)
        .input("usuario", sql.VarChar, datos.usuario)
        .query(
          "INSERT INTO tb_wap_rresultados1_reg_01 "+
          "(fecha, indicadorusuario, logroindicador, resultadometa, resultadoponderado, periodo, resultadoperiodo, aprobacionID, estatus, fecha_actualizacion, usuario, baja) "+
          "VALUES(getdate(), @indicadorusuario, @logroindicador, @resultadometa, @resultadoponderado, @periodo, @resultadoperiodo, @aprobacionID, @estatus, getdate(), @usuario, 1); SELECT SCOPE_IDENTITY() AS id;"
        );
      let res_id = resultado1.recordset[0].id;
      let res = {
        tabla: "tb_wap_rresultados1_reg_01",
        status: "CORRECTO",
        mensaje: "Se guardo correctamente",
        id: res_id,
      };
  
      return res;
    } catch (error) {
      let res = {
        tabla: "tb_wap_rresultados1_reg_01",
        status: "ERROR",
        mensaje: error.message,
      };
      return res;
    }
  }

  async function addAprobacion(datos) {
    //console.log(datos)
    try {
      const pool = await sql.connect(config);
      const aprobacion = await pool
        .request()
        .input("indicadorusuario", sql.Int, datos.indicadorusuario)
        .input("gerente", sql.Int, datos.gerente)
        .input("accion", sql.NVarChar, datos.accion)
        .input("notas", sql.VarChar, datos.notas)
        .input("estatus", sql.VarChar, datos.estatus)
        .input("usuario", sql.VarChar, datos.usuario)
        .query(
          "INSERT INTO tb_wap_raprobacion_reg_01 "+
          "(fecha, indicadorusuario, gerente, accion, notas, estatus, fecha_actualización, usuario) "+
          "VALUES(getdate(), @indicadorusuario, @gerente, @accion, @notas, @estatus, getdate(), @usuario); SELECT SCOPE_IDENTITY() AS id;"); 
      let res_id = aprobacion.recordset[0].id;
      let res = {
        tabla: "tb_wap_raprobacion_reg_01",
        status: "CORRECTO",
        mensaje: "Se guardo correctamente",
        id: res_id,
      };
  
      return res;
    } catch (error) {
      let res = {
        tabla: "tb_wap_raprobacion_reg_01",
        status: "ERROR",
        mensaje: error.message,
      };
      return res;
    }
  }


  const PERIODO_SV_RE = /^M\d{4}\.\d{2}$/;

  const reportarResultadoConEvidencia = async (req, res) => {
    if (!req.file || !req.file.filename) {
      return res
        .status(400)
        .json({ status: "ERROR", mensaje: "Archivo de evidencia requerido." });
    }
    const b = req.body || {};
    const soporte = req.user && requireSvRole.esPrivilegioApoyoSv(req.user);
    const jwtEmail = String((req.user && req.user.email) || "").trim().toLowerCase();
    let usuarioCorreo = String(b.usuario || "").trim().toLowerCase();

    if (!soporte) {
      if (!usuarioCorreo) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_e) {}
        return res.status(400).json({
          status: "ERROR",
          mensaje: "Usuario no indicado.",
        });
      }
      if (jwtEmail && usuarioCorreo !== jwtEmail) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_e2) {}
        return res.status(403).json({
          status: "ERROR",
          mensaje: "El correo del formulario no coincide con su sesión.",
        });
      }
    }

    let periodoVal = String(b.periodo || "").trim();
    let colaboradorIdSoporte = null;
    if (soporte) {
      colaboradorIdSoporte = parseInt(b.colaboradorId, 10);
      const emailCol = String(b.usuarioRegistro || "").trim().toLowerCase();
      if (!Number.isFinite(colaboradorIdSoporte) || !emailCol) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_e) {}
        return res.status(400).json({
          status: "ERROR",
          mensaje:
            "Modo soporte: indique colaborador (ID Tempus) y usuarioRegistro (correo del colaborador).",
        });
      }
      usuarioCorreo = emailCol;
      const pm = String(b.periodo_manual || "").trim();
      if (pm) {
        if (!PERIODO_SV_RE.test(pm)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (_e2) {}
          return res.status(400).json({
            status: "ERROR",
            mensaje: "Periodo inválido. Use formato MAAAA.MM (ejemplo: M2026.04).",
          });
        }
        periodoVal = pm;
      }
    }

    if (!periodoVal || !PERIODO_SV_RE.test(periodoVal)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_e) {}
      return res.status(400).json({
        status: "ERROR",
        mensaje: "Periodo inválido o ausente.",
      });
    }

    let transaction;
    try {
      const pool = await sql.connect(config);
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      const indicadorusuario = parseInt(b.indicadorusuario, 10);
      const gerente = parseInt(b.gerente, 10);
      if (!Number.isFinite(indicadorusuario) || !Number.isFinite(gerente)) {
        throw new Error("Datos de indicador o gerente no válidos.");
      }

      const ownerId = soporte
        ? colaboradorIdSoporte
        : parseInt(req.user.id, 10);
      const ownChk = await new sql.Request(transaction)
        .input("iu", sql.Int, indicadorusuario)
        .input("uid", sql.Int, ownerId)
        .query(
          "SELECT 1 AS ok FROM tb_wap_rindicadorusuario_reg_01 tu WHERE tu.ID = @iu AND tu.usuarioID = @uid AND tu.estatus = 1"
        );
      if (!ownChk.recordset || !ownChk.recordset.length) {
        throw new Error("El indicador no corresponde al colaborador indicado.");
      }

      const notasVal = soporte
        ? `[Soporte ${jwtEmail}] ${String(b.notas || "").slice(0, 3800)}`
        : String(b.notas || "").slice(0, 4000);

      const rAprob = await new sql.Request(transaction)
        .input("indicadorusuario", sql.Int, indicadorusuario)
        .input("gerente", sql.Int, gerente)
        .input(
          "accion",
          sql.NVarChar,
          String(b.accion || "acción de prueba").slice(0, 500)
        )
        .input("notas", sql.VarChar, notasVal)
        .input(
          "estatus",
          sql.VarChar,
          String(b.aprobacion_estatus != null ? b.aprobacion_estatus : "0")
        )
        .input("usuario", sql.VarChar, usuarioCorreo)
        .query(
          "INSERT INTO tb_wap_raprobacion_reg_01 " +
            "(fecha, indicadorusuario, gerente, accion, notas, estatus, fecha_actualización, usuario) " +
            "VALUES(getdate(), @indicadorusuario, @gerente, @accion, @notas, @estatus, getdate(), @usuario); SELECT SCOPE_IDENTITY() AS id;"
        );
      const aprobacionID = rAprob.recordset[0].id;

      const resultadoponderado = parseFloat(b.resultadoponderado, 10);
      if (!Number.isFinite(resultadoponderado)) {
        throw new Error("Resultado ponderado no válido.");
      }

      const rRes = await new sql.Request(transaction)
        .input("indicadorusuario", sql.Int, indicadorusuario)
        .input("logroindicador", sql.VarChar, String(b.logroindicador))
        .input("resultadometa", sql.VarChar, String(b.resultadometa))
        .input("resultadoponderado", sql.Float, resultadoponderado)
        .input("periodo", sql.VarChar, periodoVal)
        .input("resultadoperiodo", sql.VarChar, String(b.resultadoperiodo))
        .input("aprobacionID", sql.Int, aprobacionID)
        .input(
          "estatus",
          sql.VarChar,
          String(b.resultado_estatus != null ? b.resultado_estatus : "0")
        )
        .input("usuario", sql.VarChar, usuarioCorreo)
        .query(
          "INSERT INTO tb_wap_rresultados1_reg_01 " +
            "(fecha, indicadorusuario, logroindicador, resultadometa, resultadoponderado, periodo, resultadoperiodo, aprobacionID, estatus, fecha_actualizacion, usuario, baja) " +
            "VALUES(getdate(), @indicadorusuario, @logroindicador, @resultadometa, @resultadoponderado, @periodo, @resultadoperiodo, @aprobacionID, @estatus, getdate(), @usuario, 1); SELECT SCOPE_IDENTITY() AS id;"
        );
      const resultadoID = rRes.recordset[0].id;

      await new sql.Request(transaction)
        .input("resultadoID", sql.Int, resultadoID)
        .input("url", sql.VarChar, req.file.filename)
        .input("usuario", sql.VarChar, usuarioCorreo)
        .query(
          "INSERT INTO tb_wap_revidencia_reg_01 " +
            "(fecha, resultadoID, url, fecha_actualizacion, usuario) " +
            "VALUES(getdate(), @resultadoID, @url, getdate(), @usuario);"
        );

      await transaction.commit();
      return res.status(201).json({
        status: "CORRECTO",
        mensaje: "Registro y evidencia guardados correctamente.",
        id: resultadoID,
        aprobacionID,
      });
    } catch (err) {
      console.error("reportarResultadoConEvidencia:", err);
      try {
        if (transaction) await transaction.rollback();
      } catch (_r) {}
      try {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      } catch (_u) {}
      return res.status(500).json({
        status: "ERROR",
        mensaje: err.message || "Error al guardar el reporte.",
      });
    }
  };


  const addEvidencia = async(req, res) => {
      try {
        if (!req.file || !req.file.filename) {
          return res.status(400).json({
            tabla: "tb_wap_revidencia_reg_01",
            status: "ERROR",
            mensaje: "Archivo de evidencia requerido.",
            id: 0,
          });
        }
        const resultadoID = parseInt(req.body.resultadoID, 10);
        if (!Number.isFinite(resultadoID)) {
          try { fs.unlinkSync(req.file.path); } catch (_e) {}
          return res.status(400).json({
            tabla: "tb_wap_revidencia_reg_01",
            status: "ERROR",
            mensaje: "resultadoID no válido.",
            id: 0,
          });
        }
        let pool = await sql.connect(config);
        let evidenciaIns = await pool
          .request()
          .input("resultadoID", sql.Int, resultadoID)
          .input("url", sql.VarChar, req.file.filename)
          .input("usuario", sql.VarChar, req.body.usuario)
          .query(
            "INSERT INTO tb_wap_revidencia_reg_01 "+
            "(fecha, resultadoID, url, fecha_actualizacion, usuario) "+
            "VALUES(getdate(), @resultadoID, @url, getdate(), @usuario); SELECT SCOPE_IDENTITY() AS id;"
            );
        const newId = evidenciaIns.recordset[0].id;
        return res.status(201).json({
          tabla: "tb_wap_revidencia_reg_01",
          status: "CORRECTO",
          mensaje: "Se guardó correctamente",
          id: newId,
        });
      } catch (error) {
        console.error("addEvidencia:", error);
        try {
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        } catch (_e) {}
        return res.status(500).json({
          tabla: "tb_wap_revidencia_reg_01",
          status: "ERROR",
          mensaje: error.message,
          id: 0,
        });
      }
   };

   const updateResultadoStatus = async (req, res) => {
        
    const { id } = req. params;
   const { estatus } = req.body
   try {
    const pool = await sql.connect(config);
    await pool.request()
    .input('Id', id)
    .input('estatus', sql.NVarChar, estatus)
    .query("UPDATE tb_wap_rresultados1_reg_01 "+
    "SET  estatus = @estatus "+
    "WHERE ID=@Id;");

    let respuesta = await {
      tabla: "resultados1",
      status: "Correcto",
      mensaje: "Se actualizo status correctamente",
    };
    
    return res.json(respuesta);
   } catch (error) {
    let resultado = {
      tabla: "resultados1",
      status: "ERROR",
      mensaje: error.message
    };
    return res.json(resultado);
   }
   }

   async function getResultados() {
    try {
    
      let pool = await sql.connect(config);
      let resultados = await pool
        .request()
        .query("SELECT estatus, periodo "+
        "FROM tb_wap_rresultados1_reg_01;");
      return resultados.recordsets;
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rresultados1_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function getMacroDesc(data) {
    try {

      let pool = await sql.connect(config);
      let macro = await pool
        .request()
        .input("desc", sql.VarChar, data.desc)
        .query("SELECT ID, fecha, desc1, lider, estatus, fecha_actualizacion, usuario "+
        "FROM tb_wap_rmacroproceso_reg_01 "+
        "WHERE desc1 = @desc;");

      return macro.recordsets[0];
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  

  async function getIndicadoresByGerente(data) {
    try {
      let pool = await sql.connect(config);
      let indicador = await pool
        .request()
        .input("email", sql.VarChar, data.email)
        .query("SELECT i.ID idindicador, i.fecha, i.desc1, i.macroproceso, i.proceso, i.procedimiento, i.formula, i.fuenteDI, i.notas, i.conversion, i.fecha_actualización, i.usuario, i.estatus, "+
            "m.desc1 macro, i.ID idmacro "+
            "FROM tb_wap_rindicador_reg_01 i JOIN tb_wap_rmacroproceso_reg_01 m ON i.macroproceso = m.ID WHERE i.usuario = 'usuario' ORDER BY i.desc1 ASC;"); 
      return indicador.recordsets;
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicador_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  const AutorizarIndicador = async (req, res) => {
        
    const { id } = req. params;
   const { estatus, usuario } = req.body
   try {
    const pool = await sql.connect(config);
    await pool.request()
    .input('Id', id)
    .input('estatus', sql.NVarChar, estatus)
    .input('usuario', sql.VarChar, usuario)
    .query("UPDATE tb_wap_rindicador_reg_01 "+
    "SET fecha_actualización = getdate(), estatus = @estatus, usuarioact = @usuario "+
    "WHERE ID=@Id;");

    let respuesta = await {
      tabla: "tb_wap_rindicador_reg_01",
      status: "Correcto",
      mensaje: "Se actualizo status correctamente",
    };
    
    return res.json(respuesta);
   } catch (error) {
    let resultado = {
      tabla: "resultados1",
      status: "ERROR",
      mensaje: error.message
    };
    return res.json(resultado);
   }
   }

   const updateIndicador = async (req, res) => {
        
    const { id } = req. params;
   const { fecha, desc1, macroproceso, proceso, procedimiento, formula, fuenteDI, notas, conversion } = req.body
   try {
    const pool = await sql.connect(config);
    await pool.request()
    .input('Id', id)
    .input("fecha", sql.Date, fecha)
    .input("desc1", sql.NVarChar, desc1)
    .input("macroproceso", sql.Int, macroproceso)
    .input("proceso", sql.Int, proceso)
    .input("procedimiento", sql.Int, procedimiento)
    .input("formula", sql.VarChar, formula)
    .input("fuenteDI", sql.VarChar, fuenteDI)
    .input("notas", sql.NVarChar, notas)
    .input("conversion", sql.VarChar, conversion)
    .query("UPDATE tb_wap_rindicador_reg_01 "+
    "SET fecha = @fecha, desc1 = @desc1, formula = @formula, fuenteDI = @fuenteDI, notas = @notas, macroproceso = @macroproceso, proceso = @proceso, procedimiento = @procedimiento, conversion = @conversion, fecha_actualización = getdate() "+
    "WHERE ID=@Id;");

    let respuesta = await {
      tabla: "tb_wap_rindicador_reg_01",
      status: "Correcto",
      mensaje: "Se actualizo correctamente",
    };
    
    return res.json(respuesta);
   } catch (error) {
    let resultado = {
      tabla: "tb_wap_rindicador_reg_01",
      status: "ERROR",
      mensaje: error.message
    };
    return res.json(resultado);
   }
   }

   

   async function getTotalIndicadoresUsuario(data) {
    try {
      let pool = await sql.connect(config);
      let indicador = await pool
        .request()
        .input("id", sql.VarChar, data.id)
        .query("SELECT "+
        "riu.usuarioID, "+
        "SUM(riu.peso) AS suma_peso "+
    "FROM "+
        "tb_wap_rindicadorusuario_reg_01 riu "+
      "JOIN tb_wap_rindicador_reg_01 ri ON ri.ID = riu.indicadorID "+
    "WHERE "+
        "usuarioID = @id AND ri.estatus = 1 "+
    "GROUP BY "+
        "riu.usuarioID;"); 
      return indicador.recordsets[0][0].suma_peso;
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function getIndicadoresUsuario(data) {
    try {
      //console.log(data);
      let pool = await sql.connect(config);
      let indicador = await pool
        .request()
        .input("id", sql.VarChar, data.id)
        .query(`SELECT 
    riu.ID, 
	   convert(varchar(11),riu.fecha,113) AS fecha,
    ri.desc1, 
    CASE WHEN ri.estatus = 1 THEN 'Sí' ELSE 'No' END AS estatus, 
    CASE WHEN riu.estatus = 1 THEN 'Sí' ELSE 'No' END AS activo, 
    riu.maximo, 
    riu.minimo, 
    riu.meta, 
    riu.peso,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM GAECTIDB.dbo.tb_wap_rresultados1_reg_01 AS r 
            WHERE r.indicadorusuario = riu.ID
        ) THEN 'Sí' 
        ELSE 'No' 
    END AS TieneResultados
FROM 
    GAECTIDB.dbo.tb_wap_rindicadorusuario_reg_01 AS riu
JOIN 
    GAECTIDB.dbo.tb_wap_rindicador_reg_01 AS ri 
    ON ri.ID = riu.indicadorID
WHERE 
    riu.usuarioID = @id AND ri.estatus = 1;`); 
      //console.log ('dATOS');
      return indicador.recordsets[0];
    } catch (err) {
      console.log(err.message);
      let res = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  //Esta funcion es para actualizar los parametros de la asignación, solo los que no tienen historial
  const updateIndicadorUsuario = async (req, res) => {
        
    const { id } = req. params;
   const { minimo, meta, peso, usuario, maximo } = req.body
   try {
    const pool = await sql.connect(config);
    await pool.request()
    .input('Id', id)
    .input("minimo", sql.VarChar, minimo)
    .input("meta", sql.VarChar, meta)
    .input("peso", sql.VarChar, peso)
    .input("usuario", sql.VarChar, usuario)
    .input("maximo", sql.VarChar, maximo)
    .query("UPDATE tb_wap_rindicadorusuario_reg_01 "+
    "SET minimo=@minimo, meta=@meta, peso=@peso, fecha_actualizacion = getdate(), usuario=@usuario, maximo=@maximo "+
    "WHERE ID = @Id;");

    let respuesta = await {
      tabla: "tb_wap_rindicadorusuario_reg_01",
      status: "Correcto",
      mensaje: "Se actualizo correctamente",
    };
    
    return res.json(respuesta);
   } catch (error) {
    let resultado = {
      tabla: "tb_wap_rindicadorusuario_reg_01",
      status: "ERROR",
      mensaje: error.message
    };
    return res.json(resultado);
   }
   }

  //esta función es solo para dar de baja o alta el indicador
  const updateIndicadorUsuarioEstatus = async (req, res) => {
    const { indicadorID } = req.body;
    const { estatus, usuario } = req.body;
    //console.log(indicadorID, estatus, usuario);
    try {
      const pool = await sql.connect(config);
      await pool.request()
        .input("indicadorID", sql.Int, indicadorID)
        .input("estatus", sql.VarChar, estatus)
        .input("usuario", sql.VarChar, usuario)
        .query(
          "UPDATE GAECTIDB.dbo.tb_wap_rindicadorusuario_reg_01 " +
          "SET estatus = @estatus, fecha_actualizacion = getdate(), usuario = @usuario " +
          "WHERE ID = @indicadorID;"
        );

      let respuesta = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "Correcto",
        mensaje: "Se actualizó el estatus correctamente",
      };

      return res.json(respuesta);
    } catch (error) {
      let resultado = {
        tabla: "tb_wap_rindicadorusuario_reg_01",
        status: "ERROR",
        mensaje: error.message
      };
      return res.json(resultado);
    }
  };

  async function empleadoEnSubarbol(pool, idJefe, idEmpleado) {
    if (!Number.isFinite(idJefe) || !Number.isFinite(idEmpleado)) return false;
    const r = await pool
      .request()
      .input("id_jefe", sql.Int, idJefe)
      .input("id_emp", sql.Int, idEmpleado)
      .query(`WITH RecursiveEmployeeHierarchy AS (
          SELECT e1.ID_Empleado FROM TempusGEC.dbo.empleado e1 WHERE e1.ID_Empleado = @id_jefe
          UNION ALL
          SELECT e2.ID_Empleado FROM TempusGEC.dbo.empleado e2
          INNER JOIN RecursiveEmployeeHierarchy reh ON reh.ID_Empleado = e2.ID_JefeDirecto
        )
        SELECT 1 AS ok WHERE EXISTS (
          SELECT 1 FROM RecursiveEmployeeHierarchy WHERE ID_Empleado = @id_emp
        );`);
    return !!(r.recordset && r.recordset.length > 0);
  }

  function auditUsuarioFromReq(req, paramUsuarioEncoded) {
    const fromJwt = req.user && req.user.email != null ? String(req.user.email).trim() : "";
    if (fromJwt) return fromJwt;
    try {
      return decodeURIComponent(String(paramUsuarioEncoded || ""));
    } catch (_e) {
      return String(paramUsuarioEncoded || "");
    }
  }

  async function assertMayActOnResultadoOwner(req, pool, ownerId) {
    const owner = parseInt(ownerId, 10);
    const uid =
      req.user && req.user.id != null ? parseInt(req.user.id, 10) : NaN;
    const rol = req.user && req.user.rol;
    if (rol === "admin" || requireSvRole.esPrivilegioApoyoSv(req.user)) {
      return { ok: true };
    }
    if (!Number.isFinite(owner) || !Number.isFinite(uid)) {
      return { ok: false, code: 403, message: "No autorizado." };
    }
    if (rol === "usuario" && uid === owner) {
      return { ok: true };
    }
    if (rol === "gerente" || rol === "supervisor") {
      const sub = await empleadoEnSubarbol(pool, uid, owner);
      if (sub) return { ok: true };
      return {
        ok: false,
        code: 403,
        message: "No autorizado para eliminar este registro.",
      };
    }
    return { ok: false, code: 403, message: "No autorizado." };
  }

  async function loadResultadoOwnerByResultadoId(pool, resultadoId) {
    const rid = parseInt(resultadoId, 10);
    if (!Number.isFinite(rid)) return null;
    const row = await pool
      .request()
      .input("Id", sql.Int, rid)
      .query(
        "SELECT tr.ID, tr.baja, tu.usuarioID AS ownerId " +
          "FROM tb_wap_rresultados1_reg_01 tr " +
          "INNER JOIN tb_wap_rindicadorusuario_reg_01 tu ON tu.ID = tr.indicadorusuario " +
          "WHERE tr.ID = @Id"
      );
    return row.recordset[0] || null;
  }

  async function loadAprobacionOwner(pool, aprobacionId) {
    const aid = parseInt(aprobacionId, 10);
    if (!Number.isFinite(aid)) return null;
    const row = await pool
      .request()
      .input("Id", sql.Int, aid)
      .query(
        "SELECT a.ID, tu.usuarioID AS ownerId " +
          "FROM tb_wap_raprobacion_reg_01 a " +
          "INNER JOIN tb_wap_rindicadorusuario_reg_01 tu ON tu.ID = a.indicadorusuario " +
          "WHERE a.ID = @Id"
      );
    return row.recordset[0] || null;
  }

  const deleteAprobacion = async (req, res) => {
    const { id } = req.params;
    try {
      const pool = await sql.connect(config);
      const rec = await loadAprobacionOwner(pool, id);
      if (!rec) {
        return res.status(404).json({
          tabla: "tb_wap_raprobacion_reg_01",
          status: "ERROR",
          mensaje: "Aprobación no encontrada.",
        });
      }
      const auth = await assertMayActOnResultadoOwner(req, pool, rec.ownerId);
      if (!auth.ok) {
        return res.status(auth.code).json({
          tabla: "tb_wap_raprobacion_reg_01",
          status: "ERROR",
          mensaje: auth.message,
        });
      }
      await pool
        .request()
        .input("Id", sql.Int, parseInt(id, 10))
        .query("DELETE FROM tb_wap_raprobacion_reg_01 WHERE ID=@Id;");

      let respuesta = {
        tabla: "tb_wap_raprobacion_reg_01",
        status: "Correcto",
        mensaje: "Registro eliminado",
      };

      return res.json(respuesta);
    } catch (error) {
      let resultado = {
        tabla: "tb_wap_raprobacion_reg_01",
        status: "ERROR",
        mensaje: error.message,
      };
      return res.json(resultado);
    }
  };

  const deleteResultado1 = async (req, res) => {
    const { id, usuario: usuarioParam } = req.params;
    const usuarioAudit = auditUsuarioFromReq(req, usuarioParam);
    try {
      const pool = await sql.connect(config);
      const rec = await loadResultadoOwnerByResultadoId(pool, id);
      if (!rec) {
        return res.status(404).json({
          tabla: "tb_wap_rresultados1_reg_01",
          status: "ERROR",
          mensaje: "Resultado no encontrado.",
        });
      }
      if (Number(rec.baja) !== 1) {
        return res.status(409).json({
          tabla: "tb_wap_rresultados1_reg_01",
          status: "ERROR",
          mensaje: "El registro ya está dado de baja.",
        });
      }
      const auth = await assertMayActOnResultadoOwner(req, pool, rec.ownerId);
      if (!auth.ok) {
        return res.status(auth.code).json({
          tabla: "tb_wap_rresultados1_reg_01",
          status: "ERROR",
          mensaje: auth.message,
        });
      }
      await pool
        .request()
        .input("Id", sql.Int, parseInt(id, 10))
        .input("usuario", sql.VarChar, usuarioAudit)
        .query(
          "UPDATE tb_wap_rresultados1_reg_01 SET fecha_actualizacion=getdate(), usuario=@usuario, baja=0 " +
            "WHERE ID=@Id;"
        );

      let respuesta = {
        tabla: "tb_wap_rresultados1_reg_01",
        status: "Correcto",
        mensaje: "Registro eliminado",
      };

      return res.json(respuesta);
    } catch (error) {
      let resultado = {
        tabla: "tb_wap_rresultados1_reg_01",
        status: "ERROR",
        mensaje: error.message,
      };
      return res.json(resultado);
    }
  };

  const deleteEvidencia = async (req, res) => {
    const { id } = req.params;
    const usuarioAudit = auditUsuarioFromReq(req, "");
    try {
      const pool = await sql.connect(config);
      const rec = await loadResultadoOwnerByResultadoId(pool, id);
      if (!rec) {
        return res.status(404).json({
          tabla: "tb_wap_revidencia_reg_01",
          status: "ERROR",
          mensaje: "Resultado no encontrado.",
        });
      }
      const auth = await assertMayActOnResultadoOwner(req, pool, rec.ownerId);
      if (!auth.ok) {
        return res.status(auth.code).json({
          tabla: "tb_wap_revidencia_reg_01",
          status: "ERROR",
          mensaje: auth.message,
        });
      }
      await pool
        .request()
        .input("Id", sql.Int, parseInt(id, 10))
        .input("usuario", sql.VarChar, usuarioAudit)
        .query(
          "UPDATE tb_wap_rresultados1_reg_01 " +
            "SET estatus = '0', fecha_actualizacion = getdate(), usuario = @usuario " +
            "WHERE ID = @Id;"
        );

      let respuesta = {
        tabla: "tb_wap_revidencia_reg_01",
        status: "Correcto",
        mensaje: "Registro eliminado",
      };

      return res.json(respuesta);
    } catch (error) {
      let resultado = {
        tabla: "tb_wap_revidencia_reg_01",
        status: "ERROR",
        mensaje: error.message,
      };
      return res.json(resultado);
    }
  };
   

  async function getResultadosRangoPeriodos(data) {
   // console.log("aqui =>",data)
    
      try {
        const pool = await sql.connect(config);
        const servt = await pool
          .request()
          .input("periodoi", sql.VarChar, data.periodoi)
          .input("periodof", sql.VarChar, data.periodof)
          .query(`WITH IndicadoresConPeso AS (
    SELECT 
        ri.usuarioID, 
        r.periodo,
        SUM(CASE WHEN r.resultadoperiodo IS NOT NULL THEN ri.peso ELSE 0 END) AS peso_total_periodo,
        SUM(CASE WHEN ri.estatus = '1' THEN 1 ELSE 0 END) AS indicadores_asignados,
        COUNT(CASE WHEN r.resultadoperiodo IS NOT NULL THEN 1 END) AS indicadores_contestados,
        SUM(CASE WHEN r.resultadoperiodo IS NOT NULL THEN r.resultadoperiodo ELSE 0 END) AS suma_resultado_periodo
    FROM 
        tb_wap_rindicadorusuario_reg_01 ri
    JOIN 
        tb_wap_rindicador_reg_01 i ON i.ID = ri.indicadorID
    LEFT JOIN 
        tb_wap_rresultados1_reg_01 r ON ri.ID = r.indicadorusuario 
    WHERE 
        r.baja = 1 
        AND r.periodo BETWEEN @periodoi AND @periodof
    GROUP BY 
        ri.usuarioID, r.periodo
)

SELECT 
    ri.usuarioID AS idcolaborador, 
    e.Estatus,
    e.NombreCompleto AS colaborador, 
    e2.ID_Empleado AS idgerente, 
    p.Descripcion AS puesto_colaborador, 
    e2.NombreCompleto AS gerente, 
    d.Descripcion AS departamento, 
    SUM(CASE WHEN r.resultadoperiodo IS NOT NULL THEN r.resultadoponderado ELSE 0 END) AS resultadonetoponderado,

	SUM(CASE WHEN r.resultadoperiodo IS NOT NULL THEN r.resultadoponderado ELSE 0 END)/
	(SELECT COUNT(DISTINCT r2.periodo)
     FROM tb_wap_rresultados1_reg_01 r2 
     WHERE r2.periodo BETWEEN @periodoi AND @periodof
    ) AS resultadoperiodosnetopromedio,

    SUM(CASE WHEN r.resultadoperiodo IS NOT NULL THEN r.resultadoperiodo ELSE 0 END) AS suma_resultado_periodo, 
    SUM(CASE WHEN r.resultadoperiodo IS NOT NULL THEN r.resultadoperiodo ELSE 0 END) / NULLIF(COUNT(CASE WHEN r.resultadoperiodo IS NOT NULL THEN 1 ELSE NULL END), 0) AS promedio_resultado_periodo,
    COUNT(DISTINCT ri.indicadorID) AS numero_total_indicadores,
    COUNT(DISTINCT CASE WHEN ri.estatus = '1' THEN ri.indicadorID ELSE NULL END) AS indicadores_asignados,
    COUNT(CASE WHEN r.resultadoperiodo IS NOT NULL THEN 1 ELSE NULL END) AS numero_indicadores_contestados,
    (SELECT COUNT(DISTINCT r2.periodo)
     FROM tb_wap_rresultados1_reg_01 r2 
     WHERE r2.periodo BETWEEN @periodoi AND @periodof
    ) AS numero_periodos

FROM 
    tb_wap_rindicadorusuario_reg_01 ri 
JOIN 
    tb_wap_rindicador_reg_01 i ON i.ID = ri.indicadorID 
JOIN 
    TempusGEC.dbo.Empleado e ON e.ID_Empleado = ri.usuarioID 
JOIN 
    TempusGEC.dbo.Empleado e2 ON e2.ID_Empleado = e.id_jefeDirecto 
JOIN 
    TempusGEC.dbo.Puesto p ON p.ID_Puesto = e.ID_Puesto 
JOIN 
    TempusGEC.dbo.Departamento d ON d.ID_Departamento = e.ID_Departamento 
LEFT JOIN 
    tb_wap_rresultados1_reg_01 r ON ri.ID = r.indicadorusuario 
    AND r.periodo BETWEEN @periodoi AND @periodof
    AND r.estatus = 1
LEFT JOIN 
    IndicadoresConPeso icp ON icp.usuarioID = ri.usuarioID AND icp.periodo = r.periodo
GROUP BY 
    ri.usuarioID, 
    e.Estatus,
    e.NombreCompleto, 
    e2.ID_Empleado, 
    p.Descripcion, 
    e2.NombreCompleto, 
    d.Descripcion;`); 
          return servt.recordsets[0];
      } catch (error) {
        let res = {
          tabla: "tb_wap_segta_reg_01",
          status: "ERROR",
          mensaje: error.message,
        };
        return res;
      }
    }

    async function valResultado(data){
        try {
          let pool = await sql.connect(config);
          let procesos = await pool
          .request()
          .input('indicadorusuario', data.indicadorusuario)
          .input('mes', data.mes)
          .input('anio', data.anio)
          .query("SELECT "+
          "CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END AS encontrado "+
      "FROM "+ 
          "tb_wap_rresultados1_reg_01 "+
      "WHERE "+
          "indicadorusuario = @indicadorusuario AND MONTH(fecha) = @mes AND YEAR(fecha) = @anio AND baja = 1;");
        
          return procesos.recordsets[0][0];
          //return ((new Date()).toISOString()).slice(8,10);
      
        } catch (error) {
          
          let res = {
            tabla: "tb_wap_rresultados1_reg_01",
            status: "ERROR",
            mensaje: error.message,
          };
          return res;
      
        }
      }


       async function cantidadColaboradores(data) {
        
          try {
            const pool = await sql.connect(config);
            const cantidad = await pool
              .request()
              .input("id_empleado", sql.Int, data.id_empleado)
              .query("SELECT count(*) as cantidad FROM TempusGEC.dbo.Empleado e WHERE e.ID_JefeDirecto = @id_empleado"); 
              return cantidad.recordsets[0][0].cantidad;
          } catch (error) {
            let res = {
              tabla: "Empleado",
              status: "ERROR",
              mensaje: error.message,
            };
            return res;
          }
        }

        async function getSupervisoresIndicadores() {
          try {
          
            let pool = await sql.connect(config);
            let usuario = await pool
              .request()
              .query("SELECT DISTINCT "+
              "i.usuario, "+
              "e.NombreCompleto, "+
              "e.ID_Empleado "+
          "FROM "+
              "tb_wap_rindicador_reg_01 i "+
          "JOIN "+
              "TempusGEC.dbo.Empleado e ON i.usuario = e.eMail  COLLATE Latin1_General_CI_AS ORDER BY e.NombreCompleto ASC; ");
            return usuario.recordsets[0];
          } catch (err) {
            console.log(err.message);
            let res = {
              tabla: "tb_wap_rindicador_reg_01",
              status: "ERROR",
              mensaje: err.message,
            };
            return res;
          }
        }

        async function getIdsJefes(data){
            try {
              let pool = await sql.connect(config);
              let jefes = await pool
              .request()
              .input("id_empleado", data.id_empleado)
              .query("WITH RecursiveCTE AS ( "+
                "SELECT ID_Empleado, ID_JefeDirecto, ID_Puesto "+
                "FROM TempusGEC.dbo.Empleado "+
                "WHERE ID_Empleado = @id_empleado "+
                "UNION ALL "+
                "SELECT e.ID_Empleado, e.ID_JefeDirecto, p.ID_Puesto "+
                "FROM TempusGEC.dbo.Empleado e "+
                "INNER JOIN RecursiveCTE r ON e.ID_Empleado = r.ID_JefeDirecto "+
                "INNER JOIN TempusGEC.dbo.Puesto p ON p.ID_Puesto = e.ID_Puesto "+
                "WHERE NOT p.Descripcion LIKE '%gerente%') "+
            "SELECT ID_JefeDirecto "+
            "FROM RecursiveCTE "+
            "WHERE ID_JefeDirecto IS NOT NULL -- Filtramos los valores nulos "+
            "ORDER BY ID_JefeDirecto ASC;");
            
              return jefes.recordsets[0];
              //return ((new Date()).toISOString()).slice(8,10);
          
            } catch (error) {
              
              let res = {
                tabla: "Empleado, Puesto",
                status: "ERROR",
                mensaje: error.message,
              };
              return res;
          
            }
          }


          async function getUsuariosIndicadoresAprobarPendientes() {
            try {
        
              let pool = await sql.connect(config);
              let usuarioind = await pool
                .request()
                .query(`SELECT 
    ri.desc1 AS indicador, 
    ri.usuario, 
    e.NombreCompleto,
	ri.estatus,
	ri.usuarioact
FROM 
    tb_wap_rindicador_reg_01 ri
JOIN 
    TempusGEC.dbo.Empleado e 
ON 
    e.eMail COLLATE SQL_Latin1_General_CP1_CI_AS = ri.usuario COLLATE SQL_Latin1_General_CP1_CI_AS
WHERE ri.usuarioact <> 'gerardo.mendez@grupoelcerezo.com'  AND ri.usuarioact <> 'auditor.procesos.op@grupoelcerezo.com'
AND ri.usuarioact <> 'auditor.procesos@grupoelcerezo.com' AND ri.estatus = 1;`);
        
              return usuarioind.recordsets[0];
            } catch (err) {
              console.log(err.message);
              let res = {
                tabla: "tb_wap_rindicadorusuario_reg_01",
                status: "ERROR",
                mensaje: err.message,
              };
              return res;
            }
          }

          async function getSumPesoById(data) {
            try {
            
              let pool = await sql.connect(config);
              let resultados = await pool
                .request()
                .input("id_empleado", data.id_empleado)
                .query(`SELECT 
    e.NombreCompleto, 
    SUM(iu.peso) AS TotalPeso
FROM 
    TempusGEC.dbo.Empleado e
JOIN 
    tb_wap_rindicadorusuario_reg_01 iu 
    ON iu.usuarioID = e.ID_Empleado
WHERE 
    iu.estatus = 1 
    AND e.ID_Empleado = @id_empleado
GROUP BY 
    e.NombreCompleto;`);
              return resultados.recordsets;
            } catch (err) {
              console.log(err.message);
              let res = {
                tabla: "tb_wap_rresultados1_reg_01",
                status: "ERROR",
                mensaje: err.message,
              };
              return res;
            }
          }
   
  module.exports = {
    getUsuariosIndicadoresAprobarPendientes,
    getMacroproceso,
    addMacroproceso,
    addProceso,
    addProcedimiento,
    getProcesos,
    getProcedimientos,
    addIndicadores,
    getIndicadores,
    addIndicadorUsuario,
    getUsuarios,
    getUsuariosIndicadores,
    addResultado1,
    addAprobacion,
    reportarResultadoConEvidencia,
    addEvidencia,
    getUsuariosIndicadoresAprobar,
    updateResultadoStatus,
    getResultados,
    getUsuariosIndicadoresreportes,
    getUsuariosIndicadoresreportesgerente,
    getUsuariosIndicadoresAprobarPerido,
    getMacroDesc,
    getMacrosByDesc,
    getProcedimientosByDesc,
    getProcesoByDesc,
    getIndicadoresByGerente,
    AutorizarIndicador,
    updateIndicador,
    getTotalIndicadoresUsuario
    ,getIndicadoresUsuario
    ,updateIndicadorUsuario
    ,deleteAprobacion
    ,deleteResultado1
    ,deleteEvidencia
    ,getResultadosRangoPeriodos
    ,valResultado
    ,cantidadColaboradores
    ,getSupervisoresIndicadores
    ,getIdsJefes
    ,getSumPesoById
    ,updateIndicadorUsuarioEstatus
  }

  

  

  
  
  


  



  

  
