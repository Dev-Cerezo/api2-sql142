/*
  Una sola tabla: dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01
  Cada fila de la hoja "Fecha" del XLSX + metadatos.

  Columnas extra respecto al Excel:
    fecha_registro_real (DATE, DEFAULT fecha servidor),
    estatus ('A'/'B'),
    fecha_actualizacion (DATETIME2, DEFAULT),
    usuario_registro (NVARCHAR),

  Por archivo se repiten en cada fila: archivo_hash, archivo_nombre, codigo_centro_costo (sin nombre:
  obtener descripción por JOIN/catálogo CECOS). numero_fila.

  Si existe una versión anterior (CosechaAguacate_Carga + Registro con FK), elimínelas manualmente
  y ejecute este script, o cree esta tabla en una base nueva.

  Importación: solo hoja "Fecha" (controllers/cosechaAguacate/carga.js).
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01 (
    id_registro BIGINT IDENTITY(1, 1) NOT NULL PRIMARY KEY,
    archivo_hash VARBINARY(32) NOT NULL,
    archivo_nombre NVARCHAR(400) NOT NULL,
    codigo_centro_costo NVARCHAR(64) NOT NULL,
    numero_fila INT NOT NULL,
    datos_json NVARCHAR(MAX) NOT NULL,
    fecha_archivo DATETIME2(3) NULL,
    temperatura NUMERIC(14, 6) NULL,
    fecha_registro_real DATE NOT NULL
      CONSTRAINT DF_CAReg_fecha_real DEFAULT (CAST(GETDATE() AS DATE)),
    estatus CHAR(1) NOT NULL
      CONSTRAINT DF_CAReg_est DEFAULT ('A'),
    fecha_actualizacion DATETIME2(3) NOT NULL
      CONSTRAINT DF_CAReg_act DEFAULT (SYSUTCDATETIME()),
    usuario_registro NVARCHAR(128) NOT NULL,
    CONSTRAINT CK_CAReg_est CHECK (estatus IN ('A', 'B')),
    CONSTRAINT UQ_CAReg_archivo_fila UNIQUE (archivo_hash, numero_fila)
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = N'IX_CAReg_hash_est'
    AND object_id = OBJECT_ID(N'dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_CAReg_hash_est
    ON dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01 (archivo_hash)
    INCLUDE (estatus)
    WHERE estatus = 'A';
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = N'IX_CAReg_centro_fecha'
    AND object_id = OBJECT_ID(N'dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_CAReg_centro_fecha
    ON dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01 (codigo_centro_costo, fecha_registro_real)
    INCLUDE (estatus);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = N'IX_CAReg_fecha_temp'
    AND object_id = OBJECT_ID(N'dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_CAReg_fecha_temp
    ON dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01 (fecha_archivo)
    INCLUDE (temperatura, estatus)
    WHERE estatus = 'A';
END
GO

/*
-- Migración: quitar columna redundante si ya existía:
IF COL_LENGTH(N'dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01', N'nombre_centro_costo') IS NOT NULL
  ALTER TABLE dbo.tb_wap_CosechaAguacate_Registro_temperaturas_reg_01 DROP COLUMN nombre_centro_costo;
GO
*/
