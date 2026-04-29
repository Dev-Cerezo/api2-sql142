const { uploadFile, createFolder, uploadFile2 } = require("../../googleDriveConfig");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sql = require("mssql");
var config = require("../../dbconfig");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload2 = multer({ storage });

const uploadFileToDrive2 = async (req, res) => {
  try {
    const folderName = req.body.FNOMBREFOLDER;
    if (!folderName) {
      return res.status(400).json({ message: "El folio es obligatorio" });
    }

    const allFiles = req.files;
    if (!allFiles || allFiles.length === 0) {
      return res.status(400).json({ message: "No se recibieron archivos" });
    }

    const rootFolderId = "1WUaBbSQxXPabY3ErrWDKI69TzLO7mUa2";

    const listaImagenes = allFiles.filter((f) => f.mimetype.startsWith("image/"));
    const listaDocs = allFiles.filter((f) => {
      const ext = path.extname(f.originalname).toLowerCase();
      return ext === ".pdf" || ext === ".xml";
    });

    const folioFolderId = await createFolder(folderName, rootFolderId);
    console.log(`✅ Carpeta Folio [${folderName}] creada con ID: ${folioFolderId}`);

    let imagenesFolderId = null;
    let pdfsFolderId = null;

    if (listaImagenes.length > 0) {
      imagenesFolderId = await createFolder("imagenes", folioFolderId);
    }

    if (listaDocs.length > 0) {
      pdfsFolderId = await createFolder("pdfs", folioFolderId);
    }

    const uploadedFiles = [];

    for (const file of allFiles) {
      const filePath = path.join(__dirname, "../uploads", file.filename);
      const mimeType = file.mimetype;
      const extension = path.extname(file.originalname).toLowerCase();

      try {
        let targetFolderId = folioFolderId;

        if (mimeType.startsWith("image/")) {
          targetFolderId = imagenesFolderId;
        } else if (extension === ".pdf" || extension === ".xml") {
          targetFolderId = pdfsFolderId;
        }

        if (targetFolderId) {
          const response = await uploadFile2(filePath, targetFolderId);
          uploadedFiles.push({
            id: response.id,
            name: file.originalname,
          });
        }
      } catch (error) {
        console.error(`❌ Error al subir ${file.originalname}:`, error.message);
      } finally {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    res.status(200).json({
      status: "success",
      driveFolderId: folioFolderId,
      folio: folderName,
      totalSubidos: uploadedFiles.length,
    });
  } catch (error) {
    console.error("💥 Error Crítico:", error.message);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
};

const uploadEvidenciasOperativas = async (req, res) => {
  try {
    const { id_solicitud, departamento } = req.body;
    const allFiles = req.files;
    const rootFolderId = "1WUaBbSQxXPabY3ErrWDKI69TzLO7mUa2";

    if (!id_solicitud || !departamento) {
      return res.status(400).json({ message: "id_solicitud y departamento son obligatorios." });
    }
    if (!allFiles || allFiles.length === 0) {
      return res.status(400).json({ message: "No se recibieron archivos." });
    }

    const pool = await sql.connect(config);
    const result = await pool.request().input("id", sql.Int, id_solicitud).query("SELECT nombre_archivo FROM tb_wap_Solicviaticos_Evidencias WHERE id_solicitud = @id");

    let folioFolderId = null;
    if (result.recordset.length > 0 && result.recordset[0].nombre_archivo) {
      folioFolderId = result.recordset[0].nombre_archivo;
    } else {
      folioFolderId = await createFolder(String(id_solicitud), rootFolderId);
      await pool
        .request()
        .input("id", sql.Int, id_solicitud)
        .input("id_drive", sql.VarChar(255), folioFolderId)
        .query(`
                    IF EXISTS (SELECT 1 FROM tb_wap_Solicviaticos_Evidencias WHERE id_solicitud = @id)
                        UPDATE tb_wap_Solicviaticos_Evidencias
                        SET nombre_archivo = @id_drive
                        WHERE id_solicitud = @id
                    ELSE
                        INSERT INTO tb_wap_Solicviaticos_Evidencias (id_solicitud, nombre_archivo)
                        VALUES (@id, @id_drive)
                `);
    }

    const mainSubfolderId = await createFolder(String(departamento).toLowerCase(), folioFolderId);

    let imagenesFolderId = null;
    let facturasFolderId = null;
    if (departamento === "evidencias_solicitante") {
      imagenesFolderId = await createFolder("imagenes_comprobacion", mainSubfolderId);
      facturasFolderId = await createFolder("facturas_xml_pdf", mainSubfolderId);
    }

    const uploadedFiles = [];
    for (const file of allFiles) {
      const filePath = path.join(__dirname, "../uploads", file.filename);
      const extension = path.extname(file.originalname).toLowerCase();

      let finalFolderId = mainSubfolderId;
      if (departamento === "evidencias_solicitante") {
        if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
          finalFolderId = imagenesFolderId;
        } else if ([".pdf", ".xml"].includes(extension)) {
          finalFolderId = facturasFolderId;
        }
      }

      try {
        const response = await uploadFile2(filePath, finalFolderId);
        uploadedFiles.push({ id: response.id, name: file.originalname });
      } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    return res.status(200).json({
      status: "success",
      total: uploadedFiles.length,
      driveFolderId: folioFolderId,
    });
  } catch (error) {
    console.error("Error uploadEvidenciasOperativas:", error);
    return res.status(500).json({ message: "Error en servidor", error: error.message });
  }
};

module.exports = { uploadFileToDrive2, upload2, uploadEvidenciasOperativas };
