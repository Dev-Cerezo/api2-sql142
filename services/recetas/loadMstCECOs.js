const fs = require("fs").promises;
const path = require("path");

function resolveProjectRelative(p) {
  if (!p || typeof p !== "string") return null;
  const trimmed = p.trim();
  if (!trimmed) return null;
  return path.isAbsolute(trimmed)
    ? trimmed
    : path.join(__dirname, "..", "..", trimmed);
}

/**
 * Prioridad:
 * 1. RECETAS_MSTCECOS_JSON_PATH — absoluta o relativa al proyecto api2-sql142 (solo lectura local).
 * 2. RECETAS_MSTCECOS_DRIVE_FILE_ID — Node descarga con Drive API cuando expira la caché;
 *    no hace falta copiar el JSON a mano si las credenciales pueden leer ese archivo.
 *
 * Caché: RECETAS_MSTCECOS_CACHE_MS (default 60000).
 * Refresco automático desde Drive: RECETAS_MSTCECOS_REFRESH_INTERVAL_MS (ej. 86400000 = 24 h),
 * solo cuando NO hay RECETAS_MSTCECOS_JSON_PATH y sí hay RECETAS_MSTCECOS_DRIVE_FILE_ID.
 */
async function loadMstCECOsJsonRaw() {
  const jsonPath = resolveProjectRelative(process.env.RECETAS_MSTCECOS_JSON_PATH);
  const driveId = process.env.RECETAS_MSTCECOS_DRIVE_FILE_ID;

  if (jsonPath) {
    const txt = await fs.readFile(jsonPath, "utf8");
    return JSON.parse(txt);
  }

  if (driveId && String(driveId).trim()) {
    const { downloadDriveFileAsUtf8 } = require("../../googleDriveConfig");
    const txt = await downloadDriveFileAsUtf8(String(driveId).trim());
    return JSON.parse(txt);
  }

  const err = new Error(
    "Configure RECETAS_MSTCECOS_JSON_PATH o RECETAS_MSTCECOS_DRIVE_FILE_ID"
  );
  err.code = "ENOTCONFIGURED";
  throw err;
}

let cache = { at: 0, payload: null };
const TTL_MS = Math.max(
  5_000,
  parseInt(process.env.RECETAS_MSTCECOS_CACHE_MS || "60000", 10) || 60_000
);

async function loadMstCECOsJsonCached() {
  const now = Date.now();
  if (cache.payload != null && now - cache.at < TTL_MS) {
    return cache.payload;
  }
  const payload = await loadMstCECOsJsonRaw();
  cache = { at: now, payload };
  return payload;
}

function invalidateMstCECOsCache() {
  cache = { at: 0, payload: null };
}

/**
 * Refresco periódico desde Drive sin reiniciar el proceso.
 */
function startMstCECOsScheduledRefreshIfConfigured() {
  const ms = parseInt(process.env.RECETAS_MSTCECOS_REFRESH_INTERVAL_MS || "0", 10);
  if (!Number.isFinite(ms) || ms < 60_000) return;

  const jsonPath = resolveProjectRelative(process.env.RECETAS_MSTCECOS_JSON_PATH);
  if (jsonPath) {
    console.warn(
      "[mstCECOs] RECETAS_MSTCECOS_REFRESH_INTERVAL_MS ignorado: definiste RECETAS_MSTCECOS_JSON_PATH."
    );
    return;
  }

  const driveId =
    process.env.RECETAS_MSTCECOS_DRIVE_FILE_ID &&
    String(process.env.RECETAS_MSTCECOS_DRIVE_FILE_ID).trim();
  if (!driveId) return;

  const tick = async () => {
    try {
      invalidateMstCECOsCache();
      await loadMstCECOsJsonCached();
      console.log("[mstCECOs] Refresco programado desde Drive OK");
    } catch (e) {
      console.warn("[mstCECOs] Refresco programado:", e.message);
    }
  };

  void tick();
  setInterval(tick, ms);
  console.log(
    `[mstCECOs] Refresco automático cada ${ms} ms (~${(ms / 3_600_000).toFixed(1)} h)`
  );
}

module.exports = {
  loadMstCECOsJsonRaw,
  loadMstCECOsJsonCached,
  invalidateMstCECOsCache,
  startMstCECOsScheduledRefreshIfConfigured,
};
