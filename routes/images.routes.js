const express = require("express");
const router = express.Router();
const imagescontroller = require("../controllers/imagenes/imagenes");

router.get("/sv/:image", imagescontroller.getImageSV);

module.exports = router;
