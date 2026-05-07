/**
 * Réplica de la plantilla Drive CMP-RP-040-R010 (requisición autorizada).
 * Datos alineados con creaDocumento2 / replaceText en document_3.gs.js
 */

function escapeHtml(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMon(v) {
  if (v == null || v === "") return "";
  const n = Number(String(v).replace(/,/g, ""));
  if (Number.isNaN(n)) return escapeHtml(String(v));
  return n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * @param {object} d
 * @param {string} [d.logoUrl] - URL accesible para <img> (opcional)
 * @param {string} d.fecha
 * @param {string} d.sucursal
 * @param {string|number} d.id_requisicion folio
 * @param {string} d.proveedor razón social
 * @param {string} d.centro_costos_display <<CECOD>> (código / descripción)
 * @param {string} d.uso
 * @param {string} d.des_tipo_compra
 * @param {string} d.des_etapa
 * @param {string} d.justificacion
 * @param {Array<{det_concepto:string,det_concepto_des:string,det_cantidad:string,det_unidad:string,det_precio:string}>} d.detalles
 * @param {string} [d.status] default AUTORIZADO
 * @param {string} d.monto_real <<SEGUIMIENTO>>
 * @param {string} d.fecha_dictamen <<LOG>>
 * @param {string} d.notas <<NOTAS>> (comentarios / historial)
 * @param {string} d.nombre_sol
 * @param {string} d.nombre_usuario
 * @param {string} [d.nombre_cotiza]
 */
function buildRequisicionCompraHtml(d) {
  const logoUrl = d.logoUrl ? escapeHtml(d.logoUrl) : "";
  const detRows = Array.isArray(d.detalles) ? d.detalles : [];
  const detHtml = detRows
    .map(
      (r) =>
        `<tr>
    <td class="c center">${escapeHtml(r.det_concepto)}</td>
    <td class="c">${escapeHtml(r.det_concepto_des)}</td>
    <td class="c center">${escapeHtml(r.det_cantidad)}</td>
    <td class="c center">${escapeHtml(r.det_unidad)}</td>
    <td class="c right">${formatMon(r.det_precio)}</td>
  </tr>`
    )
    .join("");

  const status = d.status != null ? d.status : "AUTORIZADO";
  const cotizaLine = d.nombre_cotiza
    ? `<div class="sign-sub">${escapeHtml(d.nombre_cotiza)}</div><div class="sign-label">COTIZÓ</div>`
    : "";

  const logoBlock = logoUrl
    ? `<img class="logo-img" src="${logoUrl}" alt="" />`
    : '<span class="logo-ph">LOGO</span>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Verdana, Geneva, sans-serif;
    font-size: 7pt;
    color: #000;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #000; }
  .th-grey { background: #d9d9d9; font-weight: bold; text-align: center; text-transform: uppercase; padding: 4px 3px; }
  .c { padding: 5px 4px; vertical-align: middle; }
  .center { text-align: center; }
  .right { text-align: right; }
  .header-wrap { width: 100%; margin-bottom: 0; }
  .header-wrap td { vertical-align: middle; padding: 0; }
  .logo-cell { width: 22%; text-align: center; padding: 6px !important; height: 72px; }
  .logo-img { max-width: 100px; max-height: 64px; object-fit: contain; display: block; margin: 0 auto; }
  .logo-ph { font-size: 6pt; color: #999; }
  .title-cell { width: 56%; text-align: center; padding: 8px !important; }
  .registro { font-size: 6pt; text-align: center; margin-bottom: 4px; }
  .title-main { font-size: 13pt; font-weight: bold; letter-spacing: 0.02em; }
  .meta-cell { width: 22%; font-size: 6pt; padding: 4px 6px !important; line-height: 1.35; }
  .field-row .label { width: 1%; white-space: nowrap; }
  .field-row .value { text-align: center; min-height: 18px; }
  .full-value { text-align: center; min-height: 18px; padding: 5px 4px; }
  .items-head th { font-size: 6.5pt; }
  .note-foot { font-size: 6pt; margin: 3px 0 6px 2px; }
  .sign-wrap { margin-top: 10px; width: 100%; }
  .sign-wrap td { width: 50%; text-align: center; vertical-align: top; border: 1px solid #000; padding: 10px 6px 8px; }
  .sign-name { min-height: 28px; font-weight: bold; }
  .sign-label { margin-top: 4px; font-weight: bold; text-transform: uppercase; font-size: 7pt; }
  .sign-sub { font-size: 6.5pt; margin-top: 6px; font-weight: bold; }
</style>
</head>
<body>
  <table class="header-wrap">
    <tr>
      <td class="logo-cell">${logoBlock}</td>
      <td class="title-cell">
        <div class="registro">REGISTRO</div>
        <div class="title-main">REQUISICIÓN DE COMPRA</div>
      </td>
      <td class="meta-cell">
        <div>CMP-RP-040-R010</div>
        <div>VERSIÓN 1.0</div>
        <div>SEP 2019</div>
        <div>PÁGINA 1 DE 1</div>
      </td>
    </tr>
  </table>

  <table>
    <tr>
      <td class="th-grey" style="width:33%">FECHA EMISIÓN</td>
      <td class="th-grey" style="width:33%">SUCURSAL</td>
      <td class="th-grey" style="width:34%">FOLIO</td>
    </tr>
    <tr class="field-row">
      <td class="c center value">${escapeHtml(d.fecha)}</td>
      <td class="c center value">${escapeHtml(d.sucursal)}</td>
      <td class="c center value">${escapeHtml(d.id_requisicion)}</td>
    </tr>
  </table>

  <table>
    <tr><td class="th-grey">RAZÓN SOCIAL</td></tr>
    <tr><td class="full-value">${escapeHtml(d.proveedor)}</td></tr>
  </table>

  <table>
    <tr><td class="th-grey">CENTRO DE COSTO</td></tr>
    <tr><td class="full-value">${escapeHtml(d.centro_costos_display)}</td></tr>
  </table>

  <table>
    <tr>
      <td class="th-grey" style="width:34%">USO</td>
      <td class="th-grey" style="width:33%">TIPO DE COMPRA</td>
      <td class="th-grey" style="width:33%">ETAPA</td>
    </tr>
    <tr>
      <td class="c center">${escapeHtml(d.uso)}</td>
      <td class="c center">${escapeHtml(d.des_tipo_compra)}</td>
      <td class="c center">${escapeHtml(d.des_etapa)}</td>
    </tr>
  </table>

  <table>
    <tr><td class="th-grey">JUSTIFICACIÓN / USO</td></tr>
    <tr><td class="full-value" style="text-align:left; padding-left:6px;">${escapeHtml(
      d.justificacion
    )}</td></tr>
  </table>

  <p class="note-foot">*Los centros de costos, están desglosados en la orden de compra.</p>

  <table>
    <tr class="items-head">
      <th class="th-grey" style="width:14%">CÓDIGO</th>
      <th class="th-grey" style="width:38%">CONCEPTO</th>
      <th class="th-grey" style="width:12%">CANTIDAD</th>
      <th class="th-grey" style="width:16%">UNIDAD DE MEDIDA</th>
      <th class="th-grey" style="width:20%">IMPORTE</th>
    </tr>
    ${detHtml}
  </table>

  <table>
    <tr>
      <td class="th-grey" style="width:34%">STATUS</td>
      <td class="th-grey" style="width:33%">COTIZACIÓN</td>
      <td class="th-grey" style="width:33%">FECHA DICTAMEN</td>
    </tr>
    <tr>
      <td class="c center">${escapeHtml(status)}</td>
      <td class="c center">${formatMon(d.monto_real)}</td>
      <td class="c center">${escapeHtml(d.fecha_dictamen)}</td>
    </tr>
  </table>

  <table>
    <tr><td class="th-grey">NOTAS / COMENTARIOS</td></tr>
    <tr><td class="full-value" style="text-align:left; padding:6px; white-space:pre-wrap;">${escapeHtml(d.notas)}</td></tr>
  </table>

  <table class="sign-wrap">
    <tr>
      <td>
        <div class="sign-name">${escapeHtml(d.nombre_sol)}</div>
        <div class="sign-label">SOLICITÓ</div>
      </td>
      <td>
        <div class="sign-name">${escapeHtml(d.nombre_usuario)}</div>
        <div class="sign-label">AUTORIZÓ</div>
        ${cotizaLine ? `<div style="margin-top:6px;">${cotizaLine}</div>` : ""}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  buildRequisicionCompraHtml,
  escapeHtml,
  formatMon,
};
