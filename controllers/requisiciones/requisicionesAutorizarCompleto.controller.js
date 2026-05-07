const { autorizarCompleto } = require("../../services/requisiciones/requisicionesAutorizarCompleto");

/**
 * POST /api/requisiciones/autorizarCompleto
 * Mismo cuerpo que el front envía a proxyAutorizar (sin secret).
 * Opcional: header x-requis-autorizar-key si REQUIS_AUTORIZAR_PROXY_KEY está definida.
 *
 * Entorno opcional:
 * - REQUIS_GREENFIELD_BASE_URL (default https://api2.greenfieldmf.com/api)
 * - REQUIS_DRIVE_FOLDER_ID — carpeta destino (Drive del usuario OAuth o compartida con la cuenta de servicio)
 * - REQUIS_DRIVE_AUTH=auto|oauth|service_account — auto: OAuth vía googleDriveConfig (credentials.json en raíz api2-sql142 + ACCESS_TOKEN + REFRESH_TOKEN, igual que viáticos); si falla, cuenta de servicio
 * - ACCESS_TOKEN, REFRESH_TOKEN — mismos que viáticos en el .env del servidor api2-sql142
 * - credentials.json — en la raíz de api2-sql142 (como exige googleDriveConfig.js)
 * - GOOGLE_APPLICATION_CREDENTIALS — JSON cuenta de servicio (alternativa a OAuth)
 * - REQUIS_DRIVE_SCOPE=drive — opcional, si falla la subida en unidad compartida
 * - REQUIS_SKIP_DRIVE_UPLOAD=1 → no Drive / insertaRuta; útil si solo quieres correo con adjunto sin id en servidor
 * - SMTP_USER, SMTP_PASS, … (mismo bloque que api-sql142; ver requisAutorizarEmail.js)
 * - REQUIS_MAIL_SKIP=1 → no envía correos
 * - POST /autorizarCompleto/async — misma carga que autorizarCompleto; responde 202 y termina el proceso aunque el cliente cierre la pestaña (requis_taller)
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

/**
 * POST /api/requisiciones/autorizarCompleto/async
 * Mismo body que autorizarCompleto. Responde 202 enseguida y ejecuta el flujo completo
 * en el servidor (PDF, Drive, insertaRuta, correo) sin depender de que el navegador siga abierto.
 */
function postAutorizarCompletoAsync(req, res) {
  const key = process.env.REQUIS_AUTORIZAR_PROXY_KEY;
  if (key && req.headers["x-requis-autorizar-key"] !== key) {
    return res.status(403).json({
      status: "ERROR",
      mensaje: "Proxy key inválida",
    });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const sub = body.req || {};
  const idReq = String(
    sub.id_requisicion || body.id_requisicion || ""
  ).trim();
  if (!idReq) {
    return res.status(400).json({
      status: "ERROR",
      mensaje: "Falta id_requisicion en req.",
    });
  }
  const comentarios = String(body.comentarios || "").trim();
  if (!comentarios) {
    return res.status(400).json({
      status: "ERROR",
      mensaje: "Faltan comentarios.",
    });
  }

  const snapshot = JSON.parse(JSON.stringify(body));

  setImmediate(() => {
    autorizarCompleto(snapshot)
      .then((out) => {
        const ok = String(out.status || "").toUpperCase() === "OK";
        console.log(
          "[autorizarCompleto/async] terminado",
          idReq,
          ok ? "OK" : "ERROR",
          (out.mensaje && String(out.mensaje).slice(0, 120)) || ""
        );
      })
      .catch((e) => {
        console.error("[autorizarCompleto/async] excepción", idReq, e.message || e);
      });
  });

  return res.status(202).json({
    status: "ACCEPTED",
    mensaje:
      "Tu autorización se está procesando en el servidor. Puedes cerrar esta ventana o bloquear el teléfono; en breve la requisición quedará actualizada. Revisa el listado o el correo.",
    id_requisicion: idReq,
  });
}

module.exports = { postAutorizarCompleto, postAutorizarCompletoAsync };
