const express = require("express");
const { getMstCECOs } = require("../controllers/recetas/mstCECOs.controller");

const router = express.Router();

router.get("/getMstCECOs", getMstCECOs);
router.get("/getMstCECOs/", getMstCECOs);

module.exports = router;
