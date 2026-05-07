const express = require("express");
const router = express.Router();
const viaticosAuthMiddleware = require("../controllers/middlaware/viaticosAuthMiddleware");
const { uploadFileToDrive2, upload2, uploadEvidenciasOperativas } = require("../controllers/driveAltas/uploadViaticos");

router.post("/uploadviaticos", viaticosAuthMiddleware, upload2.any(), uploadFileToDrive2);

router.post("/uploadEvidenciasOperativas", viaticosAuthMiddleware, upload2.array("files"), (req, res) => {
  uploadEvidenciasOperativas(req, res);
});

module.exports = router;
