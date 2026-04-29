var config = require("../../dbconfig"); //Instanciamos el archivo dbconfig
const sql = require("mssql"); //Se necesita paquete mssql
const jwt = require('jsonwebtoken');
//Funcion Async : Asyncrona esta devuelve un objeto


async function loginUsuario(req, res) {
    const { email, pass } = req.body;

    if (!email || !pass) {
        return res.status(400).json({ mensaje: "Email y Password son requeridos" });
    }

    try {
        const pool = await sql.connect(config);
        const result = await pool
            .request()
            .input('email', sql.VarChar, email)
            .input('pass', sql.VarChar, pass)
            .query(`
                WITH JerarquiaJefes AS (
                    SELECT ec.ID_Empleado, ec.ID_JefeDirecto, 0 as Nivel, ec.ID_Empleado as ID_Empleado_Logueado
                    FROM TempusGEC_Pruebas.dbo.empleado ec 
                    WHERE ec.email = @email AND ec.Estatus = 'A'
                    UNION ALL
                    SELECT e.ID_Empleado, e.ID_JefeDirecto, j.Nivel + 1, j.ID_Empleado_Logueado
                    FROM TempusGEC_Pruebas.dbo.empleado e
                    INNER JOIN JerarquiaJefes j ON e.ID_Empleado = j.ID_JefeDirecto
                    WHERE e.Estatus = 'A'
                ),
                DatosEmpleado AS (
                    SELECT 
                        CASE WHEN EXISTS (
                            SELECT 1 FROM TempusGEC_Pruebas.dbo.empleado e 
                            WHERE e.eMail = @email AND e.PasswordPortal = @pass
                        ) THEN 1 ELSE 0 END AS Resultado,
                        ec.ID_Empleado, ec.Nombre, ec.ApellidoPaterno, 
                        dc.Descripcion AS departamento, pc.Descripcion AS puesto,
                        suc.Descripcion AS zona -- Se agrega la descripción de la sucursal/zona
                    FROM TempusGEC_Pruebas.dbo.empleado ec 
                    INNER JOIN TempusGEC_Pruebas.dbo.Departamento dc ON dc.ID_Departamento = ec.ID_Departamento 
                    INNER JOIN TempusGEC_Pruebas.dbo.Puesto pc ON ec.ID_Puesto = pc.ID_Puesto 
                    LEFT JOIN TempusGEC_Pruebas.dbo.TablaAd01 suc ON ec.ID_TablaAd01 = suc.ID_TablaAd01 -- Join con zona
                    WHERE ec.email = @email AND ec.Estatus = 'A'
                )
                SELECT de.*, 
                       (SELECT STRING_AGG(CAST(ID_Empleado AS VARCHAR(10)), ', ') 
                        FROM JerarquiaJefes) AS Cadena_Completa_Jefes
                FROM DatosEmpleado de
            `);

        const usuario = result.recordset[0];

        if (usuario && usuario.Resultado === 1) {
            // Solución al error de expiresIn: Nos aseguramos que sea un string válido o número
            const expiracion = process.env.JWT_EXPIRES_IN || '8h';

            const token = jwt.sign(
                { 
                    id: usuario.ID_Empleado, 
                    nombre: `${usuario.Nombre} ${usuario.ApellidoPaterno}`,
                    puesto: usuario.puesto,
                    dept: usuario.departamento,
                    zona: usuario.zona, // Incluido en el payload del token
                    jerarquia: usuario.Cadena_Completa_Jefes
                }, 
                process.env.JWT_PASSWORD_SECRET || 'TuFirmaSecreta', 
                { expiresIn: expiracion }
            );

            return res.status(200).json({
                success: true,
                token: token,
                user: {
                    id: usuario.ID_Empleado,
                    nombre: `${usuario.Nombre} ${usuario.ApellidoPaterno}`,
                    puesto: usuario.puesto,
                    departamento: usuario.departamento,
                    zona: usuario.zona, // Incluido en la respuesta
                    jerarquia: usuario.Cadena_Completa_Jefes
                }
            });
        } else {
            return res.status(401).json({ success: false, mensaje: "Credenciales inválidas" });
        }

    } catch (err) {
        console.error("Error en Login:", err);
        return res.status(500).json({ success: false, mensaje: "Error interno del servidor" });
    }
}


async function getUsuario() {
    try {
      let pool = await sql.connect(config);
      let getUsuario = await pool
        .request()
        .query(
          "SELECT *FROM  usuarios"
        );
  
      return getUsuario.recordsets;
    } catch (err) {
      let res = {
        tabla: "usuarios",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }
  

  async function createUsuario(data) {
    try {
  
  
      const pool = await sql.connect(config);
  
      let createUsuario = await pool
      .request()
      .input('email', sql.VarChar, data.email)
      .input('nombre', sql.NVarChar, data.nombre)
      .input('password', sql.VarChar, data.password)
      .input('user', sql.VarChar, data.user)
      .query('INSERT INTO usuarios(email, nombre, password, activo, usuario, fecha_actualizacion, msrepl_synctran_ts) VALUES(@email, @nombre, (PWDENCRYPT(@password)), 1, @user, getdate(), null);');
      return createUsuario.recordsets;
    } catch (err) {
      let res = {
        tabla: "usuarios",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }
  
  async function getRoles() {
    try {
      let pool = await sql.connect(config);
      let getUsuario = await pool
        .request()
        .query(
          "SELECT *FROM  roles"
        );
  
      return getUsuario.recordsets;
    } catch (err) {
      let res = {
        tabla: "roles",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function createRoles(data) {
    try {
  
  
      const pool = await sql.connect(config);
  
      let createRoles = await pool
      .request()
      .input('desRol', sql.VarChar, data.desRol)
      .input('user', sql.VarChar, data.user)
      .query('INSERT INTO roles (descripcion, usuario, fecha_actualizacion, msrepl_synctran_ts) VALUES(@desRol, @user, getdate(), null);');
      return createRoles.recordsets;
    } catch (err) {
      let res = {
        tabla: "roles",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }
  

  async function getUsuariosRoles() {
    try {
      let pool = await sql.connect(config);
      let getUsuariosRoles = await pool
        .request()
        .query(
          " SELECT ur.*, u.nombre , u.email , r.descripcion  FROM usuarios_roles ur  inner join usuarios u   on ur.id_usuario  = u.id_usuario inner join roles r  on ur.id_rol  = r.id_rol"
        );
  
      return getUsuariosRoles.recordsets;
    } catch (err) {
      let res = {
        tabla: "usuarios_roles",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }


  async function createUsuariosRoles(data) {
    try {
  
  
      const pool = await sql.connect(config);
  
      let createUsuariosRoles = await pool
      .request()
      .input('id_usuario', sql.Int, data.id_usuario)
      .input('id_rol', sql.Int, data.id_rol)
      .input('user', sql.VarChar, data.user)
      .query('MERGE usuarios_roles AS TARGET USING (select @id_usuario as id_usuario, @id_rol as id_rol, @user  as usuario, @fecha_actualizacion as  getdate() ) AS SOURCE ON (TARGET.id_usuario = SOURCE.id_usuario  AND TARGET.id_rol = SOURCE.id_rol ) WHEN MATCHED  THEN DELETE WHEN NOT MATCHED BY TARGET THEN INSERT   (id_usuario, id_rol,   usuario, fecha_actualizacion, msrepl_synctran_ts) VALUES(SOURCE.id_usuario, SOURCE.id_rol, SOURCE.usuario, SOURCE.fecha_actualizacion, null)');
      return createUsuariosRoles.recordsets;
    } catch (err) {
      let res = {
        tabla: "usuarios_roles",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  
  async function createUsuariosRoles(data) {
    try {
  
  
      const pool = await sql.connect(config);
  
      let createUsuariosRoles = await pool
      .request()
      .input('id_usuario', sql.Int, data.id_usuario)
      .input('id_rol', sql.Int, data.id_rol)
      .input('user', sql.VarChar, data.user)
      .query('INSERT INTO usuarios_roles (id_usuario, id_rol,   usuario, fecha_actualizacion, msrepl_synctran_ts) VALUES(@id_usuario, @id_rol, @user, getdate(), null);');
      return createUsuariosRoles.recordsets;
    } catch (err) {
      let res = {
        tabla: "usuarios_roles",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function  deleteUsuariosRole(id_usuarios_roles) {
    try {
      let pool = await sql.connect(config);
      let deleteTipsObjetosById = await pool
        .request()
        .input('id_usuarios_roles',  id_usuarios_roles)
        .query(
          "DELETE FROM usuarios_roles WHERE id_usuarios_roles = @id_usuarios_roles "
        );
  
        return deleteTipsObjetosById.recordsets;
    } catch (err) {
      let res = {
        tabla: "TipsObjetos",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function getUsuariosExistente(data) {
    //console.log(data)
    try {
      const pool = await sql.connect(config);
      let getUsuariosExistente = await pool
        .request()
        .input('email', sql.VarChar, data.email)
      .input('pass', sql.VarChar, data.pass)
        .query(
          "select  u.id_usuario, u.nombre, u.email, u.interno, stuff( (SELECT ',' + r.descripcion FROM roles r, usuarios_roles ur WHERE ur.id_usuario  = u.id_usuario AND r.id_rol       = ur.id_rol ORDER BY r.id_rol FOR XML PATH(''), TYPE).value('.', 'varchar(max)') ,1,1,'') as roles from usuarios u where u.email =@email and pwdcompare(@pass, u.password) = 1"
        );
     return getUsuariosExistente.recordsets;
    } catch (err) {
      let res = {
        tabla: "usuarios_roles",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

    async function getUsuariosExistenteViaticos(data) {
    //console.log(data)
    try {
      const pool = await sql.connect(config);
      let getUsuariosExistente = await pool
        .request()
        .input('email', sql.VarChar, data.email)
        .query(
          " select  u.id_usuario, u.nombre, u.email, u.interno, stuff( (SELECT ',' + r.descripcion FROM roles r, usuarios_roles ur WHERE ur.id_usuario  = u.id_usuario AND r.id_rol       = ur.id_rol ORDER BY r.id_rol FOR XML PATH(''), TYPE).value('.', 'varchar(max)') ,1,1,'') as roles from usuarios u where u.email = @email"
        );
     return getUsuariosExistente.recordsets;
    } catch (err) {
      let res = {
        tabla: "usuarios_roles",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }



 
  async function getUsuariosExistenteTempus(data) {
    //console.log(data)
    try {
      const pool = await sql.connect(config);
      let getUsuariosExistenteTempus = await pool
        .request()
        .input('email', sql.VarChar, data.email)
        .input('pass', sql.VarChar, data.pass)
        .query(
          `WITH JerarquiaJefes AS (
    -- Empleado logueado (nivel 0)
    SELECT 
        ec.ID_Empleado, 
        ec.ID_JefeDirecto, 
        0 as Nivel,
        ec.ID_Empleado as ID_Empleado_Logueado
    FROM TempusGEC_Pruebas.dbo.empleado ec 
    WHERE ec.email = 'dev.ti@grupoelcerezo.com' AND ec.Estatus = 'A'
    
    UNION ALL
    
    -- Jefes superiores (recursivo)
    SELECT 
        e.ID_Empleado, 
        e.ID_JefeDirecto, 
        j.Nivel + 1,
        j.ID_Empleado_Logueado
    FROM TempusGEC_Pruebas.dbo.empleado e
    INNER JOIN JerarquiaJefes j ON e.ID_Empleado = j.ID_JefeDirecto
    WHERE e.Estatus = 'A'
),
DatosEmpleado AS (
    SELECT 
        CASE 
            WHEN EXISTS (
                SELECT 1 
                FROM TempusGEC_Pruebas.dbo.empleado e 
                WHERE e.eMail = 'dev.ti@grupoelcerezo.com' AND e.PasswordPortal = 'VIRA'
            ) 
            THEN 1 
            ELSE 0 
        END AS Resultado,
        ec.ID_Empleado, 
        ec.Nombre, 
        ec.ApellidoPaterno, 
        dc.Descripcion AS departamento, 
        pc.Descripcion AS puesto,
        suc.Descripcion AS zona_sucursal  -- Campo integrado de la segunda consulta
    FROM TempusGEC_Pruebas.dbo.empleado ec 
    INNER JOIN TempusGEC_Pruebas.dbo.Departamento dc ON dc.ID_Departamento = ec.ID_Departamento 
    INNER JOIN TempusGEC_Pruebas.dbo.Puesto pc ON ec.ID_Puesto = pc.ID_Puesto
    -- Join para traer la zona/sucursal
    LEFT JOIN TempusGEC_Pruebas.dbo.TablaAd01 suc ON ec.ID_TablaAd01 = suc.ID_TablaAd01
    WHERE ec.email = 'dev.ti@grupoelcerezo.com' AND ec.Estatus = 'A'
)
SELECT 
    de.Resultado,
    de.ID_Empleado,
    de.Nombre,
    de.ApellidoPaterno,
    de.departamento,
    de.puesto,
    de.zona_sucursal, -- Ahora disponible en el resultado final
    MAX(CASE WHEN j.Nivel = 0 THEN j.ID_Empleado END) AS Empleado_Logueado,
    (SELECT STRING_AGG(CAST(ID_Empleado AS VARCHAR(10)), ' , ') 
     WITHIN GROUP (ORDER BY Nivel DESC) 
     FROM JerarquiaJefes) AS Cadena_Completa_Jefes
FROM DatosEmpleado de
LEFT JOIN JerarquiaJefes j ON de.ID_Empleado = j.ID_Empleado_Logueado
GROUP BY 
    de.Resultado,
    de.ID_Empleado,
    de.Nombre,
    de.ApellidoPaterno,
    de.departamento,
    de.puesto,
    de.zona_sucursal`
        );

        if (getUsuariosExistenteTempus.recordsets[0][0]) {
          return getUsuariosExistenteTempus.recordsets[0][0]
        }else{
          let res = {
            tabla: "TempusGEC_Pruebas.dbo.empleado",
            status: "0",
            Resultado: 0,
          };
          return res
        }
        
    
    } catch (err) {
      let res = {
        tabla: "TempusGEC_Pruebas.dbo.empleado",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  async function valida () {

    try {
      //console.log(datos.FFECHA);
      let pool = await sql.connect(config);
      let requisicion = await pool
        .request()
        .query("select top 1 'OK' as estatus from usuarios ");
        let res = {
          proceso: 'Valida Conexion API REST y VPN ',
          status: 'OK',
          datos: requisicion.recordsets[0]
        }  
      return res;
    } catch (error) {
      let res = {
        proceso: 'Valida Conexion API REST y VPN ',
        status: 'ERROR',
        mensaje: error.message,
        error: error
      }
      return res;
    }
  }

    async function getUsuariosRoles(data) {
    console.log(data)
    try {
      const pool = await sql.connect(config);
      let getUsuariosExistenteTempus = await pool
        .request()
        .input('email', sql.VarChar, data.email)
        .query(
          `SELECT 
          u.id_usuario,
          u.email,
          u.nombre,
          u.usuario,
          u.interno,
          r.descripcion AS rol,
          r.id_rol
          FROM GAECTIDB.dbo.usuarios u
          JOIN GAECTIDB.dbo.usuarios_roles ur ON u.id_usuario = ur.id_usuario
          JOIN GAECTIDB.dbo.roles r ON r.id_rol = ur.id_rol
          WHERE u.email = @email;`
        );

        if (getUsuariosExistenteTempus.recordsets[0][0]) {
          return getUsuariosExistenteTempus.recordsets[0][0]
        }else{
          let res = {
            tabla: "TempusGEC_Pruebas.dbo.empleado",
            status: "0",
            Resultado: 0,
          };
          return res
        }
        
    
    } catch (err) {
      let res = {
        tabla: "TempusGEC_Pruebas.dbo.empleado",
        status: "ERROR",
        mensaje: err.message,
      };
      return res;
    }
  }

  

  module.exports = {
    createUsuario,
    getUsuario,
    getRoles,
    createRoles,
    getUsuariosRoles,
    createUsuariosRoles,
    getUsuariosExistente,
    deleteUsuariosRole,
    getUsuariosExistenteTempus,
    valida,
    getUsuariosRoles,
  loginUsuario,
  getUsuariosExistenteViaticos
  };
  