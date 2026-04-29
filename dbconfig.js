const dotenv = require("dotenv");
var environment = process.env.NODE_ENV || "development";
if (environment == "test ") {
  environment = "test";
}

dotenv.config({
  path: `.env.${environment}`,
});
console.log(process.env)
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10),
  pool: {
    max: parseInt(process.env.DB_POOL_MAX, 10) || 15,
    min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE, 10) || 30000,
  },
  options: {
    conectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 6000,
    encrypt: process.env.DB_ENCRYPT === "true" || false,
    trustServerCertificate: process.env.DB_TRUST_CERT === "true" || false,
  },
};

module.exports = config;
