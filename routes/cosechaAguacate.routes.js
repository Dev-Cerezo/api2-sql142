const express = require("express");
const multer = require("multer");
const cargaCtrl = require("../controllers/cosechaAguacate/carga");
const reportesCtrl = require("../controllers/cosechaAguacate/reportes");
const { usuarioDesdeCabeceras } = require("../controllers/cosechaAguacate/authUsuario");

const router = express.Router();

const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function handleCatch(error, response) {
  const msg = error && error.message ? String(error.message) : "Error interno";
  if (msg.startsWith("VALIDACION:")) {
    const text = msg.replace(/^VALIDACION:\s*/i, "").trim();
    const status =
      /^no existe/i.test(text) ? 404 : 400;
    return response.status(status).json({
      success: false,
      error: text,
    });
  }
  if (error.code === "ARCHIVO_DUPLICADO" || msg.startsWith("DUPLICADO:")) {
    const text = msg.replace(/^DUPLICADO:\s*/i, "").trim();
    return response.status(409).json({
      success: false,
      error: text,
      codigo: "ARCHIVO_DUPLICADO",
    });
  }
  if (/invalid column name/i.test(msg)) {
    return response.status(500).json({
      success: false,
      error: msg.trim(),
    });
  }
  console.error("cosecha-aguacate", error);
  return response.status(500).json({
    success: false,
    error: msg,
  });
}

function opcionesManualDesdeBody(req, usuario_alta, codigo_centro_costo) {
  const orig =
    req.body.origen_carga ??
    req.body.origenCarga ??
    undefined;
  return {
    codigo_centro_costo,
    usuario_alta,
    temperatura: req.body.temperatura ?? req.body.temp,
    fecha_medicion:
      req.body.fecha_medicion ??
      req.body.fecha_archivo ??
      req.body.fecha,
    humedad_relativa_pct: req.body.humedad_relativa_pct,
    punto_condensacion_c: req.body.punto_condensacion_c,
    origen_carga: orig,
  };
}

/** @deprecated usar POST /carga con JSON o form sin archivo — se mantiene por compatibilidad */
router.post("/carga-manual", (req, res) => {
  const usuario_alta = usuarioDesdeCabeceras(req);
  const codigo_centro_costo =
    req.body.codigo_centro_costo ??
    req.body.codigoCentroCosto ??
    req.body.rancho_codigo ??
    "";
  cargaCtrl
    .guardarCapturaManual(opcionesManualDesdeBody(req, usuario_alta, codigo_centro_costo))
    .then((result) => res.status(201).json(result))
    .catch((err) => handleCatch(err, res));
});

router.post(
  "/carga",
  uploadMem.single("archivo"),
  (req, res) => {
    const usuario_alta = usuarioDesdeCabeceras(req);
    const codigo_centro_costo =
      req.body.codigo_centro_costo ??
      req.body.codigoCentroCosto ??
      req.body.rancho_codigo ??
      "";

    if (req.file && req.file.buffer) {
      const rawRep =
        req.body.reemplazar_si_duplicado ??
        req.body.reemplazarSiDuplicado ??
        "";
      const origenRaw =
        req.body.origen_carga ?? req.body.origenCarga ?? undefined;

      const reemplazar_si_duplicado =
        rawRep === true ||
        rawRep === 1 ||
        String(rawRep).toLowerCase() === "true" ||
        String(rawRep) === "1";

      return cargaCtrl
        .procesarCargaArchivo({
          buffer: req.file.buffer,
          originalname: req.file.originalname || "archivo.xlsx",
          codigo_centro_costo,
          usuario_alta,
          reemplazar_si_duplicado,
          origen_carga: origenRaw,
        })
        .then((result) => res.status(201).json(result))
        .catch((err) => handleCatch(err, res));
    }

    /* Misma URL que Excel: sin archivo pero con datos de lectura → captura manual */
    const tempRaw = req.body.temperatura ?? req.body.temp;
    const tieneTemperatura =
      tempRaw != null && String(tempRaw).trim() !== "";

    if (!tieneTemperatura) {
      return res.status(400).json({
        success: false,
        error:
          "Debe adjuntar el archivo en el campo 'archivo' (form-data multipart) " +
          "o enviar captura en el mismo endpoint con campo 'temperatura' numérico y código de centro.",
      });
    }

    return cargaCtrl
      .guardarCapturaManual(
        opcionesManualDesdeBody(req, usuario_alta, codigo_centro_costo),
      )
      .then((result) => res.status(201).json(result))
      .catch((err) => handleCatch(err, res));
  }
);

router.get("/reportes", (req, res) => {
  const { desde, hasta, incluir_baja } = req.query;
  const codigo_centro_costo =
    req.query.codigo_centro_costo ??
    req.query.codigoCentroCosto ??
    "";
  reportesCtrl
    .listarPorRango(desde, hasta, codigo_centro_costo, incluir_baja)
    .then((result) => res.status(200).json(result))
    .catch((err) => handleCatch(err, res));
});

router.get("/graficos", (req, res) => {
  const { desde, hasta } = req.query;
  const codigo_centro_costo =
    req.query.codigo_centro_costo ??
    req.query.codigoCentroCosto ??
    "";
  reportesCtrl
    .agregadosParaGraficos(desde, hasta, codigo_centro_costo)
    .then((result) => res.status(200).json(result))
    .catch((err) => handleCatch(err, res));
});

router.put("/registro/:id", (req, res) => {
  reportesCtrl
    .actualizarRegistro(req.params.id, { ...req.body })
    .then((result) => res.status(200).json(result))
    .catch((err) => handleCatch(err, res));
});

router.delete("/registro/:id", (req, res) => {
  reportesCtrl
    .eliminarLogico(req.params.id)
    .then((result) => res.status(200).json(result))
    .catch((err) => handleCatch(err, res));
});

module.exports = router;
