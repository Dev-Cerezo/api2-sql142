const { generateRequisicionCompraPdfBuffer } = require("../../services/requisiciones/requisicionCompraPdf");

/**
 * POST /api/requisiciones/generarPdfRequisicion
 * Body: campos de la plantilla (ver requisicionCompraPdfHtml.js). Opcional proxy key si está configurada.
 */
async function generarPdfRequisicion(req, res) {
  const key = process.env.REQUIS_AUTORIZAR_PROXY_KEY;
  if (key && req.headers["x-requis-autorizar-key"] !== key) {
    return res.status(403).json({ status: "ERROR", mensaje: "Proxy key inválida" });
  }

  const b = req.body || {};
  try {
    const pdf = await generateRequisicionCompraPdfBuffer({
      fecha: b.fecha || "",
      sucursal: b.sucursal || "",
      id_requisicion: b.id_requisicion != null ? b.id_requisicion : "",
      proveedor: b.proveedor || "",
      centro_costos_display: b.centro_costos_display || b.cecod || "",
      uso: b.uso || "",
      des_tipo_compra: b.des_tipo_compra || "",
      des_etapa: b.des_etapa || "",
      justificacion: b.justificacion || "",
      detalles: b.detalles || [],
      status: b.status || "AUTORIZADO",
      monto_real: b.monto_real,
      fecha_dictamen: b.fecha_dictamen || b.log_fecha || "",
      notas: b.notas || b.comentarios || "",
      nombre_sol: b.nombre_sol || "",
      nombre_usuario: b.nombre_usuario || "",
      nombre_cotiza: b.nombre_cotiza || "",
      logoUrl: b.logoUrl || "",
    });
    const name =
      "REQUISICION_DE_COMPRA_" + String(b.id_requisicion || "folio") + ".pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    return res.status(200).send(pdf);
  } catch (e) {
    console.error("[generarPdfRequisicion]", e);
    return res.status(500).json({
      status: "ERROR",
      mensaje: String(e.message || e),
    });
  }
}

module.exports = { generarPdfRequisicion };
