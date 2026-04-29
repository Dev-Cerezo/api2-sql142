/**
 * API REST (viáticos, altadrive, login, registro chofer, cosecha aguacate).
 * Login idéntico a api-sql142/routes/login.routes.js montado en /api/login.
 * Front HTML/JS: proyecto hermano aguacateTemperatura (puerto por defecto 3004).
 */
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
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, autorizacion, X-API-KEY, Access-Control-Allow-Request-Method, X-Usuario, X-Login-Usuario"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

const login_route = require("./routes/login.routes");
const viaticosRoutes = require("./routes/viaticos.routes");
const altadriveRoutes = require("./routes/uploadalta.routes");
const registroChoferRoutes = require("./routes/registroChofer.routes");
const cosechaAguacateRoutes = require("./routes/cosechaAguacate.routes");

app.use("/api/login", login_route);
app.use("/api/viaticos", viaticosRoutes);
app.use("/api/altadrive", altadriveRoutes);
app.use("/api/registro-chofer", registroChoferRoutes);
app.use("/api/cosecha-aguacate", cosechaAguacateRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "api2-sql142-viaticos" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Error interno" });
});

app.listen(port, () => {
  console.log(`[api2-sql142] Viáticos API escuchando en puerto ${port}`);
});
