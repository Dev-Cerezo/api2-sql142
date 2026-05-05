const express = require("express");
const router = express.Router();
const viaticosAuthMiddleware = require("../controllers/middlaware/viaticosAuthMiddleware");
const saveviaticos = require("../controllers/viaticos/save");
const vincularDrive = require("../controllers/viaticos/update");
const getviaticos = require("../controllers/viaticos/get");

router.use(viaticosAuthMiddleware);

router.route("/addviaticos").post((request, response) => {
  let params = { ...request.body };
  saveviaticos
    .addSolicitudViaticos(params)
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((error) => {
      const msg = error && error.message ? String(error.message) : "Error al guardar";
      if (msg.startsWith("VALIDACION:")) {
        return response.status(400).json({ error: msg.replace(/^VALIDACION:\s*/i, "").trim() });
      }
      console.error("addviaticos", error);
      return response.status(500).json({ error: msg });
    });
});

router.route("/vincularDrive").post((request, response) => {
  let params = { ...request.body };
  vincularDrive
    .vincularDrive(params)
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((e) => response.status(500).json({ error: e.message }));
});

router.route("/updateEstatusOperativo").put((request, response) => {
  let params = { ...request.body };
  vincularDrive
    .updateEstatusOperativo(params)
    .then((result) => {
      response.status(200).json(result);
    })
    .catch((e) => {
      const code = e.statusCode || 500;
      response.status(code).json({ error: e.message });
    });
});

router.route("/getviaticos").post((request, response) => {
  let params = { ...request.body };
  getviaticos.getHistorialViaticos(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/getHistorialSubordinados").post((request, response) => {
  let params = { ...request.body };
  getviaticos.getHistorialSubordinados(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/getViaticosEstatus234").get((request, response) => {
  getviaticos.getViaticosEstatus234().then((result) => {
    response.status(200).json(result);
  });
});

router.route("/getViaticosConfirmacion").post((request, response) => {
  let params = { ...request.body };
  getviaticos
    .getViaticosConfirmacion(params)
    .then((result) => {
      response.status(200).json(result);
    })
    .catch((error) => {
      response.status(500).json({ error: error.message });
    });
});

router.route("/updateEstatusGerente").put((request, response) => {
  let params = { ...request.body };
  vincularDrive
    .updateEstatusGerente(params)
    .then((result) => {
      response.status(201).json(result);
    })
    .catch((e) => {
      const code = e.statusCode || 500;
      response.status(code).json({ success: false, mensaje: e.message });
    });
});

router.post("/updateEstatusComprobacion", (req, res) => {
  const params = { ...req.body };
  vincularDrive
    .updateEstatusComprobacion(params)
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
});

module.exports = router;
