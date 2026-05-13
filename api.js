/**
 * API REST (viáticos, altadrive, login, registro chofer, cosecha aguacate, conductores ESR, indicadores SV).
 * Cosecha temperaturas aguacate: JWT (POST /api/login/loginAguacate) + Bearer en /api/cosecha-aguacate/* .
 * Indicadores (indicadores/appSV): POST /api/login/loginT + Bearer obligatorio en /api/sv/* (mismo criterio que api-sql142).
 * Login idéntico a api-sql142/routes/login.routes.js montado en /api/login (y /api3/login en gateway).
 * Front HTML/JS: proyecto hermano aguacateTemperatura (puerto por defecto 3004).
 *
 * Cosecha: por defecto usa tabla corta; INSERT incluye origen_carga=E/M si la columna existe.
 * Sin columna origen_carga en BD antigua: COSECHA_TABLA_SIN_ORIGEN_CARGA=1. Modo Excel con hash:
 * COSECHA_TABLA_COMPLETA=1 — ver cosechaModoTabla.js.
 *
 * Variables .env: `npm run dev` fuerza NODE_ENV=test → se carga `.env.test` antes que `.env.development`.
 * Aquí se cargan `.env.${NODE_ENV}` y luego `.env` (sin sobrescribir claves ya definidas en el sistema).
 *
 * `CORS_ALLOWED_ORIGINS`: orígenes permitidos para el navegador, separados por coma. Vacío → se usa `*` (cualquier origen).
 * Si define esta variable y el navegador muestra "Failed to fetch" con la API encendida, incluya el origen EXACTO
 * de la página (p. ej. http://127.0.0.1:5500 y http://localhost:5500 son distintos para CORS).
 */
const path = require("path");
const dotenv = require("dotenv");
const nodeEnv = (process.env.NODE_ENV || "development").trim();
dotenv.config({ path: path.join(__dirname, `.env.${nodeEnv}`) });
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const app = express();
const port = process.env.PORT || 3004;

function corsAllowedOriginList() {
  return String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Cabeceras CORS alineadas con el front (Bearer, multipart, APIs legadas). */
const CORS_ALLOW_HEADERS =
  "Origin, X-Requested-With, Content-Type, Accept, Authorization, autorizacion, X-API-KEY, Access-Control-Allow-Request-Method, X-Usuario, X-Login-Usuario, x-requis-autorizar-key";

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use((req, res, next) => {
  const lista = corsAllowedOriginList();
  const origin = req.headers.origin;
  let allowOrigin = "*";

  if (lista.length > 0) {
    if (!origin) {
      /** Clientes sin cabecera Origin (curl, integraciones servidor). Mantener permisivo. */
      allowOrigin = "*";
    } else if (lista.includes(origin)) {
      allowOrigin = origin;
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
    } else {
      console.warn(
        "[CORS api2-sql142] Origen no permitido:",
        origin || "(sin cabecera Origin)",
        "| Configurar CORS_ALLOWED_ORIGINS en .env con este origen explícito (incluya http/https y puerto).",
        "Lista actual:",
        lista
      );
      if (req.method === "OPTIONS") {
        return res.status(403).send("CORS: origen no permitido");
      }
      return res.status(403).json({ error: "CORS: origen no permitido" });
    }
  }

  res.header("Access-Control-Allow-Origin", allowOrigin);
  res.header("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

const login_route = require("./routes/login.routes");
const viaticosRoutes = require("./routes/viaticos.routes");
const altadriveRoutes = require("./routes/uploadalta.routes");
const registroChoferRoutes = require("./routes/registroChofer.routes");
const cosechaAguacateRoutes = require("./routes/cosechaAguacate.routes");
const conductoresRoutes = require("./routes/conductores.routes");
const requisicionesRoutes = require("./routes/requisiciones.routes");
const sv_route = require("./routes/sv.routes");
const img_route = require("./routes/images.routes");
const recetas_route = require("./routes/recetas.routes");

app.use("/api/login", login_route);
app.use("/api/viaticos", viaticosRoutes);
app.use("/api/altadrive", altadriveRoutes);
/** Alias /api3/* para el front viaticosApp y gateways que reescriben a esta API. */
app.use("/api3/login", login_route);
app.use("/api3/viaticos", viaticosRoutes);
app.use("/api3/altadrive", altadriveRoutes);
app.use("/api/registro-chofer", registroChoferRoutes);
app.use("/api/cosecha-aguacate", cosechaAguacateRoutes);
app.use("/api/conductores", conductoresRoutes);
app.use("/api/requisiciones", requisicionesRoutes);
/** Indicadores (indicadores/appSV): mismos paths que api-sql142. */
app.use("/api/sv", sv_route);
app.use("/api/images", img_route);

/** Maestro recetas (CECO1): GET /api/getMstCECOs/ — RECETAS_MSTCECOS_* en .env */
app.use("/api", recetas_route);

app.get("/api/health", (req, res) => {  res.json({ ok: true, service: "api2-sql142-viaticos" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Error interno" });
});

app.listen(port, "0.0.0.0", () => {
  try {
    const { ensureSvUploadDir } = require("./lib/svUploadPaths");
    const dir = ensureSvUploadDir();
    console.log(`[SV evidencias] carpeta: ${dir}`);
  } catch (e) {
    console.warn("[SV evidencias] no se pudo preparar carpeta:", e.message);
  }
  console.log(
    `[API api2-sql142 escuchando en puerto ${port}`
  );
  try {
    const {
      startMstCECOsScheduledRefreshIfConfigured,
    } = require("./services/recetas/loadMstCECOs");
    startMstCECOsScheduledRefreshIfConfigured();
  } catch (e) {
    console.warn("[mstCECOs] refresco programado:", e.message);
  }
});
