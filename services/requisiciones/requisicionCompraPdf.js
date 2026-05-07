const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL } = require("url");
const { buildRequisicionCompraHtml } = require("./requisicionCompraPdfHtml");

const GET_EMPRESAS_URL =
  process.env.REQUIS_GET_EMPRESAS_URL ||
  "https://api2.greenfieldmf.com/api/getEmpresasReq";

const MAX_LOGO_BYTES = 4 * 1024 * 1024;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Carpeta por defecto: api2-sql142/assets/requisiciones/logos */
function defaultLogosDir() {
  return path.join(__dirname, "..", "..", "assets", "requisiciones", "logos");
}

function logosDir() {
  const d = (process.env.REQUIS_LOGOS_DIR || "").trim();
  return d ? path.resolve(d) : defaultLogosDir();
}

/** IDs de archivo Google Drive suelen ser tokens largos; nombres locales no. */
function looksLikeDriveFileId(s) {
  const t = String(s || "").trim();
  if (t.length < 20) return false;
  return /^[a-zA-Z0-9_-]{20,}$/.test(t);
}

/** { mtime, map } para recargar logos.json si cambia en disco */
let logosMapState = { mtime: -1, map: null };

function readLogosMap(dir) {
  const p = path.join(dir, "logos.json");
  let mtime = -1;
  try {
    mtime = fs.statSync(p).mtimeMs;
  } catch (_e) {
    return {};
  }
  if (logosMapState.map != null && logosMapState.mtime === mtime) {
    return logosMapState.map;
  }
  const map = {};
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    if (j && typeof j === "object") {
      Object.keys(j).forEach((k) => {
        map[k.trim()] = String(j[k] || "").trim();
      });
    }
  } catch (_e) {
    /* vacío */
  }
  logosMapState = { mtime, map };
  return map;
}

/** Valor en logos.json por clave exacta o misma razón social sin distinguir mayúsculas */
function mapFileForEmpresa(map, empresa) {
  if (!empresa) return null;
  const e = String(empresa).trim();
  if (map[e]) return map[e];
  const el = e.toLowerCase();
  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].trim().toLowerCase() === el) return map[keys[i]];
  }
  return null;
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function tryExtensions(basePathNoExt) {
  const exts = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  for (let i = 0; i < exts.length; i++) {
    const f = basePathNoExt + exts[i];
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

function loadLocalLogoFile(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    if (!buf.length || buf.length > MAX_LOGO_BYTES) return null;
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
      }[ext] || "image/png";
    const b64 = buf.toString("base64");
    return `data:${mime};base64,${b64}`;
  } catch (_e) {
    return null;
  }
}

/**
 * Logos en disco: prioridad sobre Drive.
 * - logos.json: { "Razón social igual que getEmpresasReq": "archivo.png" }
 * - Si logo_url del API no parece id de Drive, se usa como nombre de archivo en esta carpeta
 * - {slugify(proveedor)}.png (o .jpg, …)
 * - extra.nombreProveedor: nombre comercial distinto (slug adicional, mapa sin distinguir mayúsculas)
 */
function resolveLocalLogoDataUriSync(proveedor, row, extra) {
  const dir = logosDir();
  if (!fs.existsSync(dir)) return null;

  const map = readLogosMap(dir);
  const orderedPaths = [];
  const np =
    extra && (extra.nombreProveedor || extra.NombreProveedor)
      ? String(extra.nombreProveedor || extra.NombreProveedor).trim()
      : "";

  if (row && row.logo_url) {
    const lu = String(row.logo_url).trim();
    if (lu && !looksLikeDriveFileId(lu)) {
      orderedPaths.push(path.join(dir, path.basename(lu)));
    }
  }

  const fp = mapFileForEmpresa(map, proveedor);
  if (proveedor && fp) orderedPaths.push(path.join(dir, fp));
  if (row && row.empresa) {
    const fe = mapFileForEmpresa(map, row.empresa);
    if (fe) orderedPaths.push(path.join(dir, fe));
  }
  if (np) {
    const fnp = mapFileForEmpresa(map, np);
    if (fnp) orderedPaths.push(path.join(dir, fnp));
  }

  const slug = proveedor ? slugify(proveedor) : "";
  if (slug) {
    orderedPaths.push(path.join(dir, slug));
  }
  if (np) {
    const snp = slugify(np);
    if (snp && snp !== slug) orderedPaths.push(path.join(dir, snp));
  }

  for (let i = 0; i < orderedPaths.length; i++) {
    const p = orderedPaths[i];
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      const data = loadLocalLogoFile(p);
      if (data) return data;
    }
    const noExt = p.replace(/\.(png|jpg|jpeg|gif|webp)$/i, "");
    const found = tryExtensions(noExt);
    if (found) {
      const data = loadLocalLogoFile(found);
      if (data) return data;
    }
  }

  if (slug) {
    const found = tryExtensions(path.join(dir, slug));
    if (found) return loadLocalLogoFile(found);
  }

  return null;
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function bufferToDataUri(buf, mime) {
  const b64 = buf.toString("base64");
  const m =
    mime && /^image\//i.test(String(mime).split(";")[0].trim())
      ? String(mime).split(";")[0].trim()
      : "image/png";
  return `data:${m};base64,${b64}`;
}

function httpsGetBinaryAsDataUri(urlStr, maxRedirects) {
  maxRedirects = maxRedirects || 8;
  return new Promise((resolve) => {
    const tryOnce = (url, left) => {
      let u;
      try {
        u = new URL(url);
      } catch (_e) {
        return resolve(null);
      }
      const opts = {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: "GET",
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      };
      const req = https.request(opts, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          left > 0
        ) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          tryOnce(next, left - 1);
          return;
        }
        const chunks = [];
        let killed = false;
        res.on("data", (c) => {
          if (killed) return;
          chunks.push(c);
          if (Buffer.concat(chunks).length > MAX_LOGO_BYTES) {
            killed = true;
            req.destroy();
            resolve(null);
          }
        });
        res.on("end", () => {
          if (killed) return;
          const buf = Buffer.concat(chunks);
          if (!buf.length || res.statusCode !== 200) {
            resolve(null);
            return;
          }
          const ct = res.headers["content-type"];
          const mime = ct
            ? ct.split(";")[0].trim()
            : "application/octet-stream";
          if (
            mime.includes("text/html") ||
            mime.includes("application/json")
          ) {
            resolve(null);
            return;
          }
          resolve(bufferToDataUri(buf, mime.startsWith("image/") ? mime : "image/png"));
        });
      });
      req.on("error", () => resolve(null));
      req.setTimeout(25000, () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    };
    tryOnce(urlStr, maxRedirects);
  });
}

async function downloadDriveFileIdAsDataUri(fileId) {
  const id = String(fileId || "").trim();
  if (!id) return null;

  const keyFile = (process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  if (keyFile) {
    try {
      const { google } = require("googleapis");
      const auth = new google.auth.GoogleAuth({
        keyFile,
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      });
      const client = await auth.getClient();
      const drive = google.drive({ version: "v3", auth: client });
      const res = await drive.files.get(
        { fileId: id, alt: "media" },
        { responseType: "arraybuffer" }
      );
      const buf = Buffer.from(res.data);
      if (!buf.length || buf.length > MAX_LOGO_BYTES) return null;
      const mime =
        (res.headers && res.headers["content-type"]
          ? res.headers["content-type"].split(";")[0].trim()
          : "") || "image/png";
      return bufferToDataUri(buf, mime);
    } catch (e) {
      console.warn("[requisicionPdf] logo Drive API:", e.message);
    }
  }

  const apiKey = (process.env.REQUIS_GOOGLE_DRIVE_API_KEY || "").trim();
  if (apiKey) {
    const u = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      id
    )}?alt=media&key=${encodeURIComponent(apiKey)}`;
    const data = await httpsGetBinaryAsDataUri(u, 3);
    if (data) return data;
  }

  const candidates = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w800`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
  ];
  for (let i = 0; i < candidates.length; i++) {
    const data = await httpsGetBinaryAsDataUri(candidates[i], 10);
    if (data) return data;
  }
  return null;
}

function driveImageViewUrl(fileId) {
  const id = String(fileId || "").trim();
  if (!id) return null;
  return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
}

async function getEmpresaRowForProveedor(proveedor) {
  if (!proveedor) return null;
  const list = await httpsGetJson(GET_EMPRESAS_URL);
  if (!Array.isArray(list)) return null;
  const needle = String(proveedor).trim();
  let row = list.find((item) => item && item.empresa === needle);
  if (!row) {
    const nl = needle.toLowerCase();
    row =
      list.find(
        (item) =>
          item && String(item.empresa || "").trim().toLowerCase() === nl
      ) || null;
  }
  return row;
}

async function getLogoDriveIdForProveedor(proveedor) {
  const row = await getEmpresaRowForProveedor(proveedor);
  if (!row || !row.logo_url) return null;
  const id = String(row.logo_url).trim();
  return looksLikeDriveFileId(id) ? id : null;
}

async function resolveLogoUrlFromProveedor(proveedor) {
  const id = await getLogoDriveIdForProveedor(proveedor);
  return id ? driveImageViewUrl(id) : null;
}

let puppeteerSingleton = null;

async function getPuppeteer() {
  if (puppeteerSingleton) return puppeteerSingleton;
  try {
    puppeteerSingleton = require("puppeteer");
  } catch (e) {
    throw new Error(
      "Falta dependencia puppeteer. En api2-sql142 ejecuta: npm install puppeteer"
    );
  }
  return puppeteerSingleton;
}

/**
 * @param {object} datos ver buildRequisicionCompraHtml
 * @param {{ skipResolveLogo?: boolean }} [opts]
 * Logos: carpeta assets/requisiciones/logos o REQUIS_LOGOS_DIR. Desactivar local: REQUIS_LOGOS_USE_LOCAL=0
 */
async function generateRequisicionCompraPdfBuffer(datos, opts) {
  const d = Object.assign({}, datos);
  if (!opts || !opts.skipResolveLogo) {
    const row = d.proveedor
      ? await getEmpresaRowForProveedor(d.proveedor)
      : null;

    let embedded = null;
    if (process.env.REQUIS_LOGOS_USE_LOCAL !== "0") {
      embedded = resolveLocalLogoDataUriSync(d.proveedor, row, {
        nombreProveedor: d.NombreProveedor || d.nombreProveedor,
      });
    }

    let logoId = String(d.logoDriveId || "").trim();
    if (!logoId && row && row.logo_url && looksLikeDriveFileId(row.logo_url)) {
      logoId = String(row.logo_url).trim();
    }

    if (!embedded && logoId) {
      embedded = await downloadDriveFileIdAsDataUri(logoId);
    }

    if (!embedded && d.logoUrl && /^https?:/i.test(String(d.logoUrl))) {
      embedded = await httpsGetBinaryAsDataUri(String(d.logoUrl), 10);
    }

    if (embedded) {
      d.logoUrl = embedded;
    } else if (d.logoUrl && String(d.logoUrl).startsWith("data:")) {
      /* ya es data URI */
    } else {
      if (logoId) {
        console.warn(
          "[requisicionPdf] No se pudo incrustar logo (Drive). Local: coloca imagen en assets/requisiciones/logos o logos.json."
        );
      }
      d.logoUrl = "";
    }
  }

  const html = buildRequisicionCompraHtml(d);
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 400));
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
    return buf;
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateRequisicionCompraPdfBuffer,
  resolveLogoUrlFromProveedor,
  getEmpresaRowForProveedor,
  getLogoDriveIdForProveedor,
  driveImageViewUrl,
  buildRequisicionCompraHtml,
  downloadDriveFileIdAsDataUri,
  resolveLocalLogoDataUriSync,
  mapFileForEmpresa,
  logosDir,
};
