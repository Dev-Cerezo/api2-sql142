const express = require("express");
const router = express.Router();
const registroChoferSave = require("../controllers/registroChofer/save");
const registroChoferCrud = require("../controllers/registroChofer/crud");

function handleCatch(error, response) {
  const msg = error && error.message ? String(error.message) : "Error interno";
  if (msg.startsWith("VALIDACION:")) {
    const text = msg.replace(/^VALIDACION:\s*/i, "").trim();
    const status =
      /^no existe un registro con ese id/i.test(text) ? 404 : 400;
    return response.status(status).json({
      success: false,
      error: text,
    });
  }
  console.error("registroChofer", error);
  return response.status(500).json({
    success: false,
    error: msg,
  });
}

/** Consulta por rango (fecha_registro) */
router.get("/actividad", (request, response) => {
  const desde = request.query.desde;
  const hasta = request.query.hasta;
  registroChoferCrud
    .listarPorRango(desde, hasta)
    .then((result) => {
      response.status(200).json(result);
    })
    .catch((error) => handleCatch(error, response));
});

/** Alta */
router.post("/actividad", (request, response) => {
  const params = { ...request.body };
  registroChoferSave
    .insertarRegistro(params)
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((error) => handleCatch(error, response));
});

/** Actualizar */
router.put("/actividad/:id", (request, response) => {
  const params = { ...request.body };
  registroChoferCrud
    .actualizarPorId(request.params.id, params)
    .then((result) => {
      response.status(200).json(result);
    })
    .catch((error) => handleCatch(error, response));
});

/** Eliminar */
router.delete("/actividad/:id", (request, response) => {
  registroChoferCrud
    .eliminarPorId(request.params.id)
    .then((result) => {
      response.status(200).json(result);
    })
    .catch((error) => handleCatch(error, response));
});

module.exports = router;
