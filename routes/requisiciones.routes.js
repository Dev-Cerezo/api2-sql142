const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/requisiciones/requisicionesProxy.controller");
const pdfCtrl = require("../controllers/requisiciones/requisicionesPdf.controller");
const autoCtrl = require("../controllers/requisiciones/requisicionesAutorizarCompleto.controller");
const upCtrl = require("../controllers/requisiciones/requisicionesUploadAdjunto.controller");

router.post("/proxyAutorizar", ctrl.proxyAutorizar);
router.post("/generarPdfRequisicion", pdfCtrl.generarPdfRequisicion);
router.post("/autorizarCompleto", autoCtrl.postAutorizarCompleto);
router.post("/autorizarCompleto/async", autoCtrl.postAutorizarCompletoAsync);
router.post(
  "/uploadAdjuntoSolicitud",
  upCtrl.handleMulterUpload,
  upCtrl.postUploadAdjuntoSolicitud
);

module.exports = router;
