const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/conductores/conductoresAdmin.controller");

router.get("/", ctrl.listar);
/** Ligero: evita multipart/Drive cuando el no. empleado ya existe (único activos). */
router.get("/exists", ctrl.existeQuery);
router.get("/:id", ctrl.obtener);
router.post("/", ctrl.multerConductoresCampos, ctrl.crear);
router.put("/:id", ctrl.multerConductoresCampos, ctrl.actualizar);
router.delete("/:id", ctrl.eliminar);

module.exports = router;
