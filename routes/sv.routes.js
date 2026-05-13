/**
 * Rutas SV (portal indicadores / appSV). Migradas desde api-sql142 para consumo de indicadores/appSV.
 */
const express = require("express");
const router = express.Router();
const uploader = require("../multer/multersv");

const apisv = require("../controllers/sv/sv");
const authMiddleware = require("../controllers/middlaware/middlaware");
const requireSvRole = require("../controllers/middlaware/requireSvRole");
const requireSvGerenteReportOwnOrAdmin =
  requireSvRole.requireSvGerenteReportOwnOrAdmin;
const requireIndicadoresUsuarioScope =
  requireSvRole.requireIndicadoresUsuarioScope;
const requireVentanaCargaResultados =
  requireSvRole.requireVentanaCargaResultados;
const requireVentanaAprobacion = requireSvRole.requireVentanaAprobacion;
const requireStaffOrSoporteReporte =
  requireSvRole.requireStaffOrSoporteReporte;

const STAFF = requireSvRole("admin", "gerente", "supervisor", "do", "nomina");
const CATALOG = requireSvRole("admin", "gerente", "supervisor");
/** Quién puede cargar aprobaciones / resultados propios (colaborador incluido). */
const ALL_SV_REPORT = requireSvRole(
  "admin",
  "gerente",
  "supervisor",
  "do",
  "nomina",
  "usuario"
);

function uploadSingle(field) {
  return (req, res, next) => {
    uploader.single(field)(req, res, (err) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "El archivo supera el tamaño máximo permitido (25 MB)."
            : err.message || "Error al procesar el archivo.";
        return res.status(400).json({ status: "ERROR", mensaje: msg });
      }
      next();
    });
  };
}

router.use(authMiddleware);

router.post(
  "/addevidencia",
  uploadSingle("file"),
  ALL_SV_REPORT,
  requireVentanaCargaResultados,
  apisv.addEvidencia
);

router.post(
  "/reportarResultadoConEvidencia",
  uploadSingle("file"),
  ALL_SV_REPORT,
  requireVentanaCargaResultados,
  apisv.reportarResultadoConEvidencia
);

router.route("/getmacroprocesos").get((request, response) => {
  apisv.getMacroproceso().then((result) => {
    response.json(result);
  });
});

router.route("/addmacroproceso").post(CATALOG, (request, response) => {
  const params = { ...request.body };
  apisv.addMacroproceso(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/addproceso").post(CATALOG, (request, response) => {
  const params = { ...request.body };
  apisv.addProceso(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/addprocedimiento").post(CATALOG, (request, response) => {
  const params = { ...request.body };
  apisv.addProcedimiento(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/getprocesos/:folio").get((request, response) => {
  const params = request.params;
  apisv.getProcesos(params).then((result) => {
    response.json(result);
  });
});

router.route("/getUsuariosIndicadoresAprobarPendientes").get(requireStaffOrSoporteReporte, (request, response) => {
  apisv.getUsuariosIndicadoresAprobarPendientes().then((result) => {
    response.json(result);
  });
});

router.route("/valResultado/:indicadorusuario/:mes/:anio").get(
  ALL_SV_REPORT,
  requireVentanaCargaResultados,
  (request, response) => {
    const params = request.params;
    apisv.valResultado(params).then((result) => {
      response.json(result);
    });
  }
);

router.route("/getMacrosByDesc/:desc").get((request, response) => {
  const params = request.params;
  apisv.getMacrosByDesc(params).then((result) => {
    response.json(result);
  });
});

router.route("/getProcesoByDesc/:desc").get((request, response) => {
  const params = request.params;
  apisv.getProcesoByDesc(params).then((result) => {
    response.json(result);
  });
});

router.route("/getProcedimientosByDesc/:desc").get((request, response) => {
  const params = request.params;
  apisv.getProcedimientosByDesc(params).then((result) => {
    response.json(result);
  });
});

router.route("/getprocedimientos/:prin2").get((request, response) => {
  const params = request.params;
  apisv.getProcedimientos(params).then((result) => {
    response.json(result);
  });
});

router.route("/addindicador").post(CATALOG, (request, response) => {
  const params = { ...request.body };
  apisv.addIndicadores(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/addindicadorusuario").post(STAFF, (request, response) => {
  const params = { ...request.body };
  apisv.addIndicadorUsuario(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/addaprobacion").post(
  ALL_SV_REPORT,
  requireVentanaCargaResultados,
  (request, response) => {
    const params = { ...request.body };
    apisv.addAprobacion(params).then((result) => {
      response.status(201).json(result);
    });
  }
);

router.route("/getIdsJefes").post(STAFF, (request, response) => {
  const params = { ...request.body };
  apisv.getIdsJefes(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/getSumPesoById").post(
  ALL_SV_REPORT,
  requireVentanaCargaResultados,
  (request, response) => {
    const params = { ...request.body };
    apisv.getSumPesoById(params).then((result) => {
      response.status(201).json(result);
    });
  }
);

router.route("/addresultado1").post(
  ALL_SV_REPORT,
  requireVentanaCargaResultados,
  (request, response) => {
    const params = { ...request.body };
    apisv.addResultado1(params).then((result) => {
      response.status(201).json(result);
    });
  }
);

router.route("/getindicadores").get((request, response) => {
  apisv.getIndicadores().then((result) => {
    response.json(result);
  });
});

router.route("/getSupervisoresIndicadores").get(requireStaffOrSoporteReporte, (request, response) => {
  apisv.getSupervisoresIndicadores().then((result) => {
    response.json(result);
  });
});

router.route("/getusuarios").get(requireStaffOrSoporteReporte, (request, response) => {
  apisv.getUsuarios(request.query).then((result) => {
    response.json(result);
  });
});

router.route("/getusuariosindicadores").get(
  ALL_SV_REPORT,
  requireIndicadoresUsuarioScope,
  (request, response) => {
    apisv
      .getUsuariosIndicadores(request.user, request.query)
      .then((result) => {
        response.json(result);
      });
  }
);

router.route("/getusuariosindicadoresaprobar").get(requireStaffOrSoporteReporte, (request, response) => {
  apisv.getUsuariosIndicadoresAprobar().then((result) => {
    response.json(result);
  });
});

router.route("/getusuariosindicadoresaprobarperiodo/:periodo").get(requireStaffOrSoporteReporte, (request, response) => {
  const params = request.params;
  apisv.getUsuariosIndicadoresAprobarPerido(params).then((result) => {
    response.json(result);
  });
});

router.route("/getusuariosindicadoresreportes/:fechai/:fechaf").get(requireStaffOrSoporteReporte, (request, response) => {
  const params = request.params;
  apisv.getUsuariosIndicadoresreportes(params).then((result) => {
    response.json(result);
  });
});

router.route("/getusuariosindicadoresreportesgerente/:fechai/:fechaf/:idgerente").get(requireSvGerenteReportOwnOrAdmin, (request, response) => {
  const params = request.params;
  apisv.getUsuariosIndicadoresreportesgerente(params).then((result) => {
    response.json(result);
  });
});

router.route("/getresultados").get(requireStaffOrSoporteReporte, (request, response) => {
  apisv.getResultados().then((result) => {
    response.json(result);
  });
});

router.put(
  "/updateresultado1status/:id",
  requireStaffOrSoporteReporte,
  requireVentanaAprobacion,
  apisv.updateResultadoStatus
);

router.put(
  "/AutorizarIndicador/:id",
  requireStaffOrSoporteReporte,
  apisv.AutorizarIndicador
);

router.put("/updateIndicador/:id", CATALOG, apisv.updateIndicador);

router.put("/updateIndicadorUsuario/:id", STAFF, apisv.updateIndicadorUsuario);

router.post("/updateIndicadorUsuarioEstatus", STAFF, apisv.updateIndicadorUsuarioEstatus);

router.put(
  "/deleteAprobacion/:id",
  ALL_SV_REPORT,
  requireVentanaAprobacion,
  apisv.deleteAprobacion
);

router.put(
  "/deleteResultado1/:id/:usuario",
  ALL_SV_REPORT,
  requireVentanaAprobacion,
  apisv.deleteResultado1
);

router.put(
  "/deleteEvidencia/:id",
  ALL_SV_REPORT,
  requireVentanaAprobacion,
  apisv.deleteEvidencia
);

router.route("/cantidadColaboradores").post((request, response) => {
  const params = { ...request.body };
  apisv.cantidadColaboradores(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/getmacrodesc/:desc").get((request, response) => {
  const params = request.params;
  apisv.getMacroDesc(params).then((result) => {
    response.json(result);
  });
});

router.route("/getIndicadoresByGerente").post(requireStaffOrSoporteReporte, (request, response) => {
  const params = { ...request.body };
  apisv.getIndicadoresByGerente(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/getTotalIndicadoresUsuario").post(requireStaffOrSoporteReporte, (request, response) => {
  const params = { ...request.body };
  apisv.getTotalIndicadoresUsuario(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/getIndicadoresUsuario").post(requireIndicadoresUsuarioScope, (request, response) => {
  const params = { ...request.body };
  apisv.getIndicadoresUsuario(params).then((result) => {
    response.status(201).json(result);
  });
});

router.route("/getResultadosRangoPeriodos").post(requireStaffOrSoporteReporte, (request, response) => {
  const params = { ...request.body };
  apisv.getResultadosRangoPeriodos(params).then((result) => {
    response.status(201).json(result);
  });
});

module.exports = router;
