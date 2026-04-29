const ESTADOS_PERMITIDOS = new Set(["happy", "sad"]);
const TIPOS_FALLA = new Set(["M", "S", "E", "F", "C"]);

/** Nombre físico en SQL Server (mismo que usa el INSERT). */
const TABLA_REGISTRO_CHOFER =
  process.env.TABLE_REGISTRO_CHOFER ||
  "dbo.tb_wap_registro_chofer_actividad_reg_01";

function normalizarBody(body) {
  if (!body || typeof body !== "object") {
    return {};
  }
  let tipo_falla = null;
  const rawTipo = body.tipo_falla ?? body.failureType;
  if (rawTipo != null && String(rawTipo).trim() !== "") {
    tipo_falla = String(rawTipo).trim().toUpperCase().charAt(0);
  }

  const estadoRaw = (
    body.estado_unidad ??
    body.unitStatus ??
    body.estadoUnidad ??
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  return {
    unidad_n_economico: String(body.unidad_economico ?? body.unitId ?? "")
      .trim()
      .substring(0, 50),
    unidad_prj_code: String(body.unidad_prj_code ?? body.unitPrjCode ?? "")
      .trim()
      .substring(0, 50),
    rancho_codigo: String(body.rancho_codigo ?? body.ranchoCodigo ?? "")
      .trim()
      .substring(0, 50),
    odometro_km: Number(body.odometro_km ?? body.odometer),
    nivel_combustible: parseInt(String(body.nivel_combustible ?? body.fuelLevel), 10),
    actividad: String(body.actividad ?? body.activity ?? "")
      .trim()
      .substring(0, 80),
    estado_unidad: estadoRaw,
    tipo_falla,
    usuario:
      body.usuario != null && String(body.usuario).trim() !== ""
        ? String(body.usuario).trim().substring(0, 128)
        : null,
  };
}

function validar(p) {
  const errores = [];
  if (!p.unidad_n_economico) {
    errores.push("unidad (no. económico) es obligatorio");
  }
  if (!p.unidad_prj_code) {
    errores.push("código de proyecto de unidad es obligatorio");
  }
  if (!p.rancho_codigo) {
    errores.push("código de rancho es obligatorio");
  }
  if (
    p.odometro_km == null ||
    Number.isNaN(p.odometro_km) ||
    !Number.isFinite(p.odometro_km)
  ) {
    errores.push("odómetro (km) es obligatorio y debe ser numérico");
  } else if (p.odometro_km < 0) {
    errores.push("odómetro no puede ser negativo");
  }
  if (
    Number.isNaN(p.nivel_combustible) ||
    p.nivel_combustible < 1 ||
    p.nivel_combustible > 4
  ) {
    errores.push("nivel de combustible debe ser un entero entre 1 y 4");
  }
  if (!p.actividad) {
    errores.push("actividad es obligatoria");
  }
  if (!p.estado_unidad || !ESTADOS_PERMITIDOS.has(p.estado_unidad)) {
    errores.push("estado de unidad debe ser happy o sad");
  }
  if (p.estado_unidad === "happy" && p.tipo_falla != null) {
    errores.push(
      "si la unidad está sin fallas, no debe indicarse tipo de falla",
    );
  }
  if (p.estado_unidad === "sad") {
    if (p.tipo_falla == null || !TIPOS_FALLA.has(p.tipo_falla)) {
      errores.push(
        "con falla debe indicarse tipo de falla (M, S, E, F o C)",
      );
    }
  }
  return errores;
}

/** Fila lista para INSERT/UPDATE (tipo_falla según estado). */
function prepararRow(params) {
  return {
    ...params,
    tipo_falla:
      params.estado_unidad === "sad"
        ? params.tipo_falla
        : null,
  };
}

module.exports = {
  normalizarBody,
  validar,
  prepararRow,
  TABLA_REGISTRO_CHOFER,
};
