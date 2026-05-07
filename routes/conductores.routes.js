const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/conductores/conductoresAdmin.controller");

router.get("/", ctrl.listar);
router.get("/:id", ctrl.obtener);
router.post("/", ctrl.multerConductoresCampos, ctrl.crear);
router.put("/:id", ctrl.multerConductoresCampos, ctrl.actualizar);
router.delete("/:id", ctrl.eliminar);

module.exports = router;
