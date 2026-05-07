/**
 * Proxy hacia Web App de Apps Script (doPost) para autorización completa:
 * updateReq + addComentario + fnFasesAuto + PDF (creaDocumento2) + insertaRuta + correo (fnEmail).
 *
 * Variables de entorno (.env, etc.):
 * - REQUIS_AUTORIZAR_GAS_URL = URL /exec del despliegue "Ejecutar como: Yo"
 * - REQUIS_AUTORIZAR_SECRET = misma cadena que propiedad REQUIS_AUTORIZAR_SECRET en Apps Script
 * - REQUIS_AUTORIZAR_PROXY_KEY = (opcional) si se define, el cliente debe enviar header x-requis-autorizar-key
 */

const https = require("https");
const { URL } = require("url");

function postJsonWithFollow(urlStr, payload, maxRedirects) {
  maxRedirects = maxRedirects || 5;
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const data = JSON.stringify(payload);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data, "utf8"),
      },
    };
    const req = https.request(opts, (res) => {
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location &&
        maxRedirects > 0
      ) {
        const next = new URL(res.headers.location, urlStr).href;
        postJsonWithFollow(next, payload, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
        return;
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function proxyAutorizar(req, res) {
  const key = process.env.REQUIS_AUTORIZAR_PROXY_KEY;
  if (key && req.headers["x-requis-autorizar-key"] !== key) {
    return res.status(403).json({
      status: "ERROR",
      mensaje: "Proxy key inválida",
    });
  }

  const gasUrl = String(process.env.REQUIS_AUTORIZAR_GAS_URL || "").trim();
  const secret = String(process.env.REQUIS_AUTORIZAR_SECRET || "").trim();
  if (!gasUrl || !secret) {
    return res.status(500).json({
      status: "ERROR",
      mensaje:
        "Servidor sin REQUIS_AUTORIZAR_GAS_URL o REQUIS_AUTORIZAR_SECRET en variables de entorno",
    });
  }

  const payload = Object.assign({}, req.body, {
    action: "autorizarRequisicion",
    secret: secret,
  });

  try {
    const out = await postJsonWithFollow(gasUrl, payload);
    let json;
    try {
      json = JSON.parse(out.body);
    } catch (_e) {
      const snippet = String(out.body).slice(0, 400);
      const looksHtml =
        /^\s*</.test(out.body) ||
        /<!DOCTYPE/i.test(out.body) ||
        /Procesamiento de textos/i.test(out.body);
      const hint = looksHtml
        ? " Google devolvió una página HTML (no el script). Suele pasar si: (1) la URL no es la de «Aplicación web» /exec del despliegue donde está doPost; (2) «Quién tiene acceso» no permite llamadas anónimas — usa «Cualquiera» (incluso anónimos) para POST desde Node; (3) «Ejecutar como» debe ser «Yo», no «Usuario que accede»; (4) falta republicar tras agregar doPost. "
        : " ";
      return res.status(502).json({
        status: "ERROR",
        mensaje: `HTTP ${out.statusCode}. Respuesta no es JSON.${hint}Inicio respuesta: ${snippet}`,
      });
    }
    return res.status(200).json(json);
  } catch (e) {
    return res
      .status(500)
      .json({ status: "ERROR", mensaje: String(e.message || e) });
  }
}

module.exports = { proxyAutorizar };
