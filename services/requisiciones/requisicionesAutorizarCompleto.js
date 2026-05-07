const { postJson, joinBase, firstRow } = require("./greenfieldClient");
const { generateRequisicionCompraPdfBuffer } = require("./requisicionCompraPdf");
const { uploadPdfBufferToDrive } = require("./requisDriveUploadPdf");
const {
  emailsFromGetCorreosPayload,
  sendAutorizadoEmail,
  smtpConfigured,
} = require("./requisAutorizarEmail");

const GF_BASE = (
  process.env.REQUIS_GREENFIELD_BASE_URL || "https://api2.greenfieldmf.com/api"
).trim();

function statusCorrecto(json) {
  return json && String(json.status || "").toUpperCase() === "CORRECTO";
}

function mapLineasToPdfDetalle(lineas) {
  const list = Array.isArray(lineas) ? lineas : [];
  return list.map((row) => ({
    det_concepto:
      row.det_concepto ||
      row.concepto ||
      row.CONCEPTO ||
      row.det_concepto_des ||
      "",
    det_concepto_des:
      row.det_concepto_des ||
      row.descripcion ||
      row.DESCRIPCION ||
      row.texto_libere ||
      row.texto_libre ||
      "",
    det_cantidad:
      row.det_cantidad != null
        ? String(row.det_cantidad)
        : row.cantidad != null
          ? String(row.cantidad)
          : "",
    det_unidad:
      row.det_unidad ||
      row.unidad_medida ||
      row.UNIDAD_MEDIDA ||
      row.unidad ||
      "",
    det_precio:
      row.det_precio != null
        ? String(row.det_precio)
        : row.precio != null
          ? String(row.precio)
          : "",
  }));
}

function formatFechaDictamen() {
  try {
    return new Date().toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_e) {
    return String(new Date());
  }
}

async function fetchGetCC(ceco) {
  const url = joinBase(GF_BASE, "/getCC/");
  const out = await postJson(url, { ceco: ceco || "" });
  const row = firstRow(out.json);
  if (!row) {
    return { display: String(ceco || ""), zona: "" };
  }
  const cod = row.CODIGO || row.codigo || "";
  const des = row.DESCRIPCION || row.descripcion || "";
  const zona = row.ZONA || row.zona || row.sucursal || "";
  const display =
    cod && des ? `${cod} / ${des}` : String(ceco || cod || des || "");
  return { display, zona };
}

async function fetchFnComentarios(idReq) {
  const url = joinBase(GF_BASE, "/fnComentarios/");
  const out = await postJson(url, { id: String(idReq) });
  const j = out.json;
  if (j && j.comentarios != null) return String(j.comentarios);
  return "";
}

async function callFnFasesAuto(idReq) {
  const url = joinBase(GF_BASE, "/fnFasesAuto/");
  const out = await postJson(url, { id_requisicion: String(idReq) });
  const j = out.json;
  if (!j || !j.datos) return { ok: false, faltan: -1, raw: out.raw };
  const f = j.datos.faltan_autorizar;
  const n = typeof f === "string" ? parseInt(f, 10) : Number(f);
  return { ok: true, faltan: Number.isNaN(n) ? 0 : n, raw: j };
}

async function callGetCorreos(opt, idReq, tipo) {
  const url = joinBase(GF_BASE, "/getCorreos/");
  const body = {
    opt: String(opt),
    id: String(idReq),
    tipo: tipo != null && tipo !== "" ? String(tipo) : "",
    sucursal: "",
  };
  const out = await postJson(url, body);
  return out.json;
}

async function autorizarCompleto(body) {
  const req = body.req || {};
  const idReq = String(req.id_requisicion || body.id_requisicion || "");
  if (!idReq) {
    return { status: "ERROR", mensaje: "Falta id_requisicion en req." };
  }

  const comentarios = String(body.comentarios || "").trim();
  if (!comentarios) {
    return { status: "ERROR", mensaje: "Faltan comentarios." };
  }

  const usuario = String(body.usuario || "").trim();
  const nombreUsuario =
    String(body.nombre_usuario || body.usuario || "").trim() || usuario;

  const montoEst = req.monto_estimado != null ? String(req.monto_estimado) : "0";
  const montoReal = req.monto_real != null ? String(req.monto_real) : "0";

  const upUrl = joinBase(GF_BASE, "/updateReq/");
  const addCommUrl = joinBase(GF_BASE, "/addComentario/");
  const insRutaUrl = joinBase(GF_BASE, "/insertaRuta/");

  const reqUpdate = {
    id_requisicion: idReq,
    id_estatus: "6",
    monto_estimado: montoEst.replace(/,/g, ""),
    monto_real: montoReal.replace(/,/g, ""),
  };

  let up = await postJson(upUrl, reqUpdate);
  if (!statusCorrecto(up.json)) {
    return {
      status: "ERROR",
      mensaje:
        (up.json && up.json.mensaje) ||
        "updateReq no CORRECTO: " +
        String(up.raw || "").slice(0, 200),
    };
  }

  const addBody = {
    id_requisicion: idReq,
    comentarios,
    id_estatus: "6",
    usuario,
  };
  const ac = await postJson(addCommUrl, addBody);
  if (!statusCorrecto(ac.json)) {
    return {
      status: "ERROR",
      mensaje:
        (ac.json && ac.json.mensaje) ||
        "addComentario no CORRECTO: " +
        String(ac.raw || "").slice(0, 200),
    };
  }

  const fases = await callFnFasesAuto(idReq);
  if (!fases.ok) {
    return {
      status: "ERROR",
      mensaje: "fnFasesAuto no respondió como se esperaba.",
    };
  }

  if (fases.faltan !== 0) {
    await postJson(upUrl, {
      id_requisicion: idReq,
      id_estatus: "1",
      monto_estimado: reqUpdate.monto_estimado,
      monto_real: reqUpdate.monto_real,
    });
    const mailSkip = process.env.REQUIS_MAIL_SKIP === "1";
    if (!mailSkip && smtpConfigured()) {
      try {
        const dest = emailsFromGetCorreosPayload(
          await callGetCorreos("X", idReq, req.id_tipo_compra || "")
        );
        if (dest) {
          await sendAutorizadoEmail({
            to: dest,
            cc: "",
            subject: `SOLICITUD PENDIENTE DE AUTORIZACION(ES) Requisición: ${idReq}`,
            html: `<p>Faltan autorizaciones (${fases.faltan}). Requisición ${idReq}.</p>`,
          });
        }
      } catch (e) {
        console.warn("[autorizarCompleto] correo X:", e.message);
      }
    }
    return {
      status: "ERROR",
      mensaje: `Pendientes de autorizar (faltan_autorizar=${fases.faltan}). Estatus revertido a pendiente.`,
    };
  }

  const desEtapa = String(body.des_etapa || req.des_etapa || "");
  const desTipo = String(body.des_tipo_compra || "");
  const centroDes = String(body.centro_costos_des || "");
  const ceco = await fetchGetCC(req.centro_costos);
  const notasHistorial = await fetchFnComentarios(idReq);
  const notas = [notasHistorial, comentarios].filter(Boolean).join("\n\n");

  const sucursal =
    String(body.sucursal || "").trim() ||
    ceco.zona ||
    String(req.sucursal || "");

  const centroDisplay =
    centroDes && centroDes.includes("/")
      ? centroDes
      : ceco.display || String(req.centro_costos || "");

  const pdfDatos = {
    fecha: String(req.fecha || "").slice(0, 10),
    sucursal,
    id_requisicion: idReq,
    proveedor: String(req.proveedor || req.NombreProveedor || ""),
    centro_costos_display: centroDisplay,
    uso: String(req.uso || ""),
    des_tipo_compra: desTipo || String(req.des_tipo_compra || ""),
    des_etapa: desEtapa || String(req.des_etapa || ""),
    justificacion: String(req.justificacion || ""),
    detalles: mapLineasToPdfDetalle(body.detalles || []),
    status: "AUTORIZADO",
    monto_real: montoReal,
    fecha_dictamen: formatFechaDictamen(),
    notas,
    nombre_sol: String(req.nombre_sol || ""),
    nombre_usuario: nombreUsuario,
    nombre_cotiza: String(req.nombre_cotiza || ""),
  };

  let pdfBuf;
  try {
    pdfBuf = await generateRequisicionCompraPdfBuffer(pdfDatos);
  } catch (e) {
    console.error(e);
    return {
      status: "ERROR",
      mensaje: "Error al generar PDF: " + String(e.message || e),
    };
  }

  const pdfName = `REQUISICION DE COMPRA ${idReq}.pdf`;
  let driveFileId = null;
  const skipDrive = process.env.REQUIS_SKIP_DRIVE_UPLOAD === "1";
  if (!skipDrive) {
    try {
      driveFileId = await uploadPdfBufferToDrive(pdfBuf, pdfName);
    } catch (e) {
      console.warn("[autorizarCompleto] Drive upload:", e.message);
    }
  }

  let inserta = { status: "SKIPPED", mensaje: skipDrive ? "Omitido (REQUIS_SKIP_DRIVE_UPLOAD=1)" : "Sin Drive o sin credenciales" };
  if (driveFileId) {
    const ir = await postJson(insRutaUrl, {
      id_requisicion: idReq,
      ruta: driveFileId,
    });
    inserta = ir.json || { status: "ERROR", mensaje: ir.raw };
    if (!statusCorrecto(ir.json)) {
      return {
        status: "ERROR",
        mensaje:
          "PDF generado pero insertaRuta falló: " +
          ((ir.json && ir.json.mensaje) || String(ir.raw || "").slice(0, 200)),
        pdfDriveId: driveFileId,
      };
    }
  }

  const mailSkip = process.env.REQUIS_MAIL_SKIP === "1";
  let emailSent = false;
  if (!mailSkip && smtpConfigured()) {
    try {
      const dest6 = emailsFromGetCorreosPayload(
        await callGetCorreos("6", idReq, sucursal)
      );
      const usuarioSol = emailsFromGetCorreosPayload(
        await callGetCorreos("4", idReq, "")
      );
      const ccPart = [usuarioSol, "compras.matriz@grupoelcerezo.com"]
        .filter(Boolean)
        .join(", ");
      if (dest6) {
        const attachPdf =
          process.env.REQUIS_EMAIL_ATTACH_PDF !== "0";
        const attachments = attachPdf
          ? [
              {
                filename: pdfName,
                content: pdfBuf,
                contentType: "application/pdf",
              },
            ]
          : undefined;
        await sendAutorizadoEmail({
          to: dest6,
          cc: ccPart,
          subject: `REQUISICIÓN DE COMPRA Requisición: ${idReq}`,
          html: `<p>Requisición <strong>${idReq}</strong> autorizada.</p>
            <p>Se adjunta el PDF de la requisición.</p>
            ${
              driveFileId
                ? `<p>Copia en Google Drive (id): ${driveFileId}</p>`
                : ""
            }`,
          attachments,
        });
        emailSent = true;
      }
    } catch (e) {
      console.warn("[autorizarCompleto] correo 6:", e.message);
      return {
        status: "ERROR",
        mensaje:
          "Autorizado y PDF generado, pero falló el correo: " +
          String(e.message || e),
        pdfDriveId: driveFileId || undefined,
      };
    }
  }

  let mensajeOk = "REQUISICION AUTORIZADA.";
  if (driveFileId) {
    mensajeOk =
      "REQUISICION AUTORIZADA (PDF en Drive, insertaRuta y correo según configuración).";
  } else if (emailSent) {
    mensajeOk =
      "REQUISICION AUTORIZADA. PDF enviado por correo como adjunto.";
  } else if (!smtpConfigured() || mailSkip) {
    mensajeOk +=
      " Configura SMTP_USER y SMTP_PASS (igual que en api-sql142) en el .env de api2-sql142 para enviar el PDF por correo.";
  } else {
    mensajeOk +=
      " No se obtuvieron destinatarios (getCorreos 6); revisa la requisición o el API.";
  }

  return {
    status: "OK",
    mensaje: mensajeOk,
    pdfDriveId: driveFileId || undefined,
    insertaRuta: inserta,
    emailEnviado: emailSent,
  };
}

module.exports = { autorizarCompleto, GF_BASE };
