/**
 * API REST (viáticos, altadrive, login, registro chofer, cosecha aguacate, conductores ESR).
 * Login idéntico a api-sql142/routes/login.routes.js montado en /api/login.
 * Front HTML/JS: proyecto hermano aguacateTemperatura (puerto por defecto 3004).
 *
 * Cosecha: por defecto usa tabla corta; INSERT incluye origen_carga=E/M si la columna existe.
 * Sin columna origen_carga en BD antigua: COSECHA_TABLA_SIN_ORIGEN_CARGA=1. Modo Excel con hash:
 * COSECHA_TABLA_COMPLETA=1 — ver cosechaModoTabla.js.
 *
 * Variables .env: `npm run dev` fuerza NODE_ENV=test → se carga `.env.test` antes que `.env.development`.
 * Aquí se cargan `.env.${NODE_ENV}` y luego `.env` (sin sobrescribir claves ya definidas en el sistema).
 */
const path = require("path");
const dotenv = require("dotenv");
const nodeEnv = (process.env.NODE_ENV || "development").trim();
dotenv.config({ path: path.join(__dirname, `.env.${nodeEnv}`) });
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3004;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, autorizacion, X-API-KEY, Access-Control-Allow-Request-Method, X-Usuario, X-Login-Usuario, x-requis-autorizar-key"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

const login_route = require("./routes/login.routes");
const viaticosRoutes = require("./routes/viaticos.routes");
const altadriveRoutes = require("./routes/uploadalta.routes");
const registroChoferRoutes = require("./routes/registroChofer.routes");
const cosechaAguacateRoutes = require("./routes/cosechaAguacate.routes");
const conductoresRoutes = require("./routes/conductores.routes");
const requisicionesRoutes = require("./routes/requisiciones.routes");

app.use("/api/login", login_route);
app.use("/api/viaticos", viaticosRoutes);
app.use("/api/altadrive", altadriveRoutes);
app.use("/api/registro-chofer", registroChoferRoutes);
app.use("/api/cosecha-aguacate", cosechaAguacateRoutes);
app.use("/api/conductores", conductoresRoutes);
app.use("/api/requisiciones", requisicionesRoutes);

app.get("/api/health", (req, res) => {  res.json({ ok: true, service: "api2-sql142-viaticos" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Error interno" });
});

app.listen(port, () => {
  console.log(`[API escuchando en puerto ${port}`);
});
