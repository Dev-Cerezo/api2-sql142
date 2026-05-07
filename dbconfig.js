const path = require("path");
const dotenv = require("dotenv");
const environment = (process.env.NODE_ENV || "development").trim();

dotenv.config({
  path: path.join(__dirname, `.env.${environment}`),
});

const trim = (v) => (typeof v === "string" ? v.trim() : v);

const config = {
  user: trim(process.env.DB_USER),
  password: trim(process.env.DB_PASSWORD),
  database: trim(process.env.DB_NAME),
  server: trim(process.env.DB_SERVER),
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
