/*
  Creación de tablas: usuarios, roles, usuarios_roles
  (login GET /api/login/getusuarioExiste en api2-sql142).

  Base: la misma que indique DB_NAME en .env (ajuste USE abajo si aplica).
*/

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- USE [GAECTIDB];
-- GO

IF OBJECT_ID(N'dbo.usuarios', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.usuarios (
    id_usuario            INT IDENTITY(1, 1) NOT NULL
      CONSTRAINT PK_usuarios PRIMARY KEY,
    email                 VARCHAR(255) NOT NULL,
    nombre                NVARCHAR(255) NOT NULL,
    password              VARBINARY(256) NOT NULL,
    activo                BIT NOT NULL
      CONSTRAINT DF_usuarios_activo DEFAULT (1),
    usuario               NVARCHAR(100) NULL,
    interno               VARCHAR(50) NULL,
    fecha_actualizacion   DATETIME NULL,
    msrepl_synctran_ts    VARBINARY(50) NULL
  );
  CREATE UNIQUE INDEX UX_usuarios_email ON dbo.usuarios (email);
END
GO

IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.roles (
    id_rol                INT IDENTITY(1, 1) NOT NULL
      CONSTRAINT PK_roles PRIMARY KEY,
    descripcion           VARCHAR(100) NOT NULL,
    usuario               NVARCHAR(100) NULL,
    fecha_actualizacion   DATETIME NULL,
    msrepl_synctran_ts    VARBINARY(50) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.usuarios_roles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.usuarios_roles (
    id_usuarios_roles     INT IDENTITY(1, 1) NOT NULL
      CONSTRAINT PK_usuarios_roles PRIMARY KEY,
    id_usuario            INT NOT NULL,
    id_rol                INT NOT NULL,
    usuario               NVARCHAR(100) NULL,
    fecha_actualizacion   DATETIME NULL,
    msrepl_synctran_ts    VARBINARY(50) NULL,
    CONSTRAINT FK_usuarios_roles_usuario
      FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios (id_usuario),
    CONSTRAINT FK_usuarios_roles_rol
      FOREIGN KEY (id_rol) REFERENCES dbo.roles (id_rol),
    CONSTRAINT UQ_usuarios_roles_usuario_rol UNIQUE (id_usuario, id_rol)
  );
  CREATE INDEX IX_usuarios_roles_usuario ON dbo.usuarios_roles (id_usuario);
  CREATE INDEX IX_usuarios_roles_rol ON dbo.usuarios_roles (id_rol);
END
GO
