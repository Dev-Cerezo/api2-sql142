const sql = require("mssql");
const config = require("../../dbconfig");
const {
  normalizarBody,
  validar,
  prepararRow,
  TABLA_REGISTRO_CHOFER,
} = require("./registroValidators");

async function insertarRegistro(rawBody) {
  const params = normalizarBody(rawBody);
  const errores = validar(params);
  if (errores.length > 0) {
    const err = new Error(`VALIDACION: ${errores.join(" | ")}`);
    throw err;
  }

  const row = prepararRow(params);

  const pool = await sql.connect(config);
  const result = await new sql.Request(pool)
    .input("unidad_n_economico", sql.NVarChar(50), row.unidad_n_economico)
    .input("unidad_prj_code", sql.NVarChar(50), row.unidad_prj_code)
    .input("rancho_codigo", sql.NVarChar(50), row.rancho_codigo)
    .input("odometro_km", sql.Decimal(12, 2), row.odometro_km)
    .input("nivel_combustible", sql.TinyInt, row.nivel_combustible)
    .input("actividad", sql.NVarChar(80), row.actividad)
    .input("estado_unidad", sql.NVarChar(10), row.estado_unidad)
    .input("tipo_falla", sql.Char(1), row.tipo_falla)
    .input("usuario", sql.NVarChar(128), row.usuario)
    .query(`
      INSERT INTO ${TABLA_REGISTRO_CHOFER} (
        unidad_n_economico,
        unidad_prj_code,
        rancho_codigo,
        odometro_km,
        nivel_combustible,
        actividad,
        estado_unidad,
        tipo_falla,
        usuario
      )
      VALUES (
        @unidad_n_economico,
        @unidad_prj_code,
        @rancho_codigo,
        @odometro_km,
        @nivel_combustible,
        @actividad,
        @estado_unidad,
        @tipo_falla,
        @usuario
      );
      SELECT SCOPE_IDENTITY() AS id_registro;
    `);

  const id =
    result &&
    result.recordset &&
    result.recordset[0] &&
    result.recordset[0].id_registro != null
      ? result.recordset[0].id_registro
      : null;

  return {
    success: true,
    id_registro: id,
    message: "Registro guardado",
  };
}

module.exports = {
  insertarRegistro,
};
