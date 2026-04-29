/**
 * Configuración de conexión a base de datos.
 * Sustituir con tu driver (mssql, pg, mysql2, etc.) y variables de entorno reales.
 */
const dbconfig = require("../dbconfig");

module.exports = {
  getConfig() {
    return dbconfig;
  },
};
