const express = require("express");
const router = express.Router();
const { uploadFileToDrive2, upload2, uploadEvidenciasOperativas } = require("../controllers/driveAltas/uploadViaticos");

router.post("/uploadviaticos", upload2.any(), uploadFileToDrive2);

router.post("/uploadEvidenciasOperativas", upload2.array("files"), (req, res) => {
  uploadEvidenciasOperativas(req, res);
});

module.exports = router;
