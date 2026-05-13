const {
  loadMstCECOsJsonCached,
  invalidateMstCECOsCache,
} = require("../../services/recetas/loadMstCECOs");

/**
 * GET /api/getMstCECOs[/]
 * GET ?refresh=1 — invalida caché en memoria.
 * GET ?peek=1 — solo resumen + primeros caracteres (evita colgar el IDE con respuestas enormes).
 */
async function getMstCECOs(req, res) {
  try {
    const peek =
      req.query.peek === "1" ||
      req.query.peek === "true";

    const bypass =
      req.query.refresh === "1" ||
      req.query.refresh === "true" ||
      req.headers["x-recetas-refresh"] === "1";
    if (bypass) invalidateMstCECOsCache();

    const payload = await loadMstCECOsJsonCached();

    res.setHeader("Cache-Control", "private, max-age=60");

    if (peek) {
      const str = JSON.stringify(payload);
      const keys =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? Object.keys(payload)
          : [];
      return res.json({
        ok: true,
        peek: true,
        approxBytesUtf8: Buffer.byteLength(str, "utf8"),
        topLevelKeys: keys.slice(0, 40),
        CECO1_rowCount: Array.isArray(payload?.CECO1) ? payload.CECO1.length : null,
        rootArray_length: Array.isArray(payload) ? payload.length : null,
        jsonPreviewChars: Math.min(500, str.length),
        jsonPreview: str.slice(0, 500),
      });
    }

    return res.json(payload);
  } catch (e) {
    if (e.code === "ENOTCONFIGURED") {
      return res.status(503).json({
        error: e.message,
        hint:
          "Defina RECETAS_MSTCECOS_JSON_PATH o RECETAS_MSTCECOS_DRIVE_FILE_ID en .env",
      });
    }
    console.error("[getMstCECOs]", e);
    return res.status(500).json({
      error: e.message || "No se pudo cargar el maestro mstCECOs",
    });
  }
}

module.exports = { getMstCECOs };
