const { autorizarCompleto } = require("../../services/requisiciones/requisicionesAutorizarCompleto");

/**
 * POST /api/requisiciones/autorizarCompleto
 * Mismo cuerpo que el front envía a proxyAutorizar (sin secret).
 * Opcional: header x-requis-autorizar-key si REQUIS_AUTORIZAR_PROXY_KEY está definida.
 *
 * Entorno opcional:
 * - REQUIS_GREENFIELD_BASE_URL (default https://api2.greenfieldmf.com/api)
 * - REQUIS_DRIVE_FOLDER_ID + GOOGLE_APPLICATION_CREDENTIALS → sube PDF e insertaRuta (opcional)
 * - REQUIS_SKIP_DRIVE_UPLOAD=1 → no Drive / insertaRuta; el PDF va solo como adjunto del correo (si hay SMTP)
 * - SMTP_USER, SMTP_PASS, … (mismo bloque que api-sql142; ver requisAutorizarEmail.js)
 * - REQUIS_MAIL_SKIP=1 → no envía correos
 */
async function postAutorizarCompleto(req, res) {
  const key = process.env.REQUIS_AUTORIZAR_PROXY_KEY;
  if (key && req.headers["x-requis-autorizar-key"] !== key) {
    return res.status(403).json({
      status: "ERROR",
      mensaje: "Proxy key inválida",
    });
  }

  try {
    const out = await autorizarCompleto(req.body || {});
    const ok = String(out.status || "").toUpperCase() === "OK";
    return res.status(ok ? 200 : 400).json(out);
  } catch (e) {
    console.error("[postAutorizarCompleto]", e);
    return res.status(500).json({
      status: "ERROR",
      mensaje: String(e.message || e),
    });
  }
}

module.exports = { postAutorizarCompleto };
