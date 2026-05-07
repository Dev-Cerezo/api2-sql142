const https = require("https");
const { URL } = require("url");

/**
 * POST JSON al API de requisiciones (greenfield / misma base que requis_taller).
 */
function postJson(urlStr, body) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(urlStr);
    } catch (e) {
      return reject(e);
    }
    const data = JSON.stringify(body || {});
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
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (c) => {
        raw += c;
      });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            json: JSON.parse(raw),
            raw,
          });
        } catch (_e) {
          resolve({ status: res.statusCode, json: null, raw });
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function joinBase(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "/");
  return b + (p.startsWith("/") ? p : "/" + p);
}

function unwrapRows(json) {
  if (json == null) return [];
  if (Array.isArray(json)) {
    if (!json.length) return [];
    const first = json[0];
    return Array.isArray(first) ? first : json;
  }
  return [];
}

function firstRow(json) {
  const r = unwrapRows(json);
  return r.length ? r[0] : null;
}

module.exports = {
  postJson,
  joinBase,
  unwrapRows,
  firstRow,
};
