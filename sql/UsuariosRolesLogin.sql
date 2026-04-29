/*
  Tablas usadas por GET /api/login/getusuarioExiste/:email/:pass
  (controllers/apilogin/login.js → getUsuariosExistente).

  Ejecutar contra la MISMA base configurada en api2-sql142 (.env → DB_NAME),
  habitualmente equivalente a GAECTIDB en instalaciones legacy.

  Requisitos: SQL Server con soporte para PWDENCRYPT / PWDCOMPARE (mismo esquema
  que ya usa la API al crear usuarios con PWDENCRYPT).

  Revise nombres de BD/esquema si su instancia ya tiene estas tablas con otro diseño.
*/

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* Opcional: descomente y ajuste si crea objetos en una base concreta
USE [GAECTIDB];
GO
*/

IF OBJECT_ID(N'dbo.usuarios', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.usuarios (
    id_usuario       INT IDENTITY(1, 1) NOT NULL
      CONSTRAINT PK_usuarios PRIMARY KEY,
    email            VARCHAR(255) NOT NULL,
    nombre           NVARCHAR(255) NOT NULL,
    password         VARBINARY(256) NOT NULL,
    activo           BIT NOT NULL
      CONSTRAINT DF_usuarios_activo DEFAULT (1),
    usuario          NVARCHAR(100) NULL,
    interno          VARCHAR(50) NULL,
    fecha_actualizacion DATETIME NULL,
    msrepl_synctran_ts VARBINARY(50) NULL
  );
  CREATE UNIQUE INDEX UX_usuarios_email ON dbo.usuarios(email);
END
GO

IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.roles (
    id_rol           INT IDENTITY(1, 1) NOT NULL
      CONSTRAINT PK_roles PRIMARY KEY,
    descripcion      VARCHAR(100) NOT NULL,
    usuario          NVARCHAR(100) NULL,
    fecha_actualizacion DATETIME NULL,
    msrepl_synctran_ts VARBINARY(50) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.usuarios_roles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.usuarios_roles (
    id_usuarios_roles INT IDENTITY(1, 1) NOT NULL
      CONSTRAINT PK_usuarios_roles PRIMARY KEY,
    id_usuario       INT NOT NULL,
    id_rol           INT NOT NULL,
    usuario          NVARCHAR(100) NULL,
    fecha_actualizacion DATETIME NULL,
    msrepl_synctran_ts VARBINARY(50) NULL,
    CONSTRAINT FK_usuarios_roles_usuario
      FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario),
    CONSTRAINT FK_usuarios_roles_rol
      FOREIGN KEY (id_rol) REFERENCES dbo.roles(id_rol),
    CONSTRAINT UQ_usuarios_roles_usuario_rol UNIQUE (id_usuario, id_rol)
  );
  CREATE INDEX IX_usuarios_roles_usuario ON dbo.usuarios_roles(id_usuario);
  CREATE INDEX IX_usuarios_roles_rol ON dbo.usuarios_roles(id_rol);
END
GO

/* Roles esperados por AppcoshAguacate / aguacateTemperatura (includes en texto) */
MERGE dbo.roles AS T
USING (VALUES
  (N'AGUACATE'),
  (N'ADMIN'),
  (N'ADMCOSECHAAGUACATE')
) AS S(descripcion)
ON T.descripcion = S.descripcion
WHEN NOT MATCHED BY TARGET THEN
  INSERT (descripcion, usuario, fecha_actualizacion)
  VALUES (S.descripcion, N'script-init', SYSUTCDATETIME());
GO

/*
  Usuario de ejemplo (cambie correo y contraseña en claro).
  La contraseña se guarda con PWDENCRYPT para que PWDCOMPARE funcione igual que en la API.
*/
DECLARE @demo_email VARCHAR(255) = N'demo.aguacate@su-dominio.com';
DECLARE @demo_nombre NVARCHAR(255) = N'Usuario demo aguacate';
DECLARE @demo_pass  NVARCHAR(128) = N'CambieEstaClave123!';
DECLARE @demo_user  NVARCHAR(100) = N'script-init';

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE email = @demo_email)
BEGIN
  INSERT INTO dbo.usuarios (email, nombre, password, activo, usuario, fecha_actualizacion, interno)
  VALUES (@demo_email, @demo_nombre, PWDENCRYPT(@demo_pass), 1, @demo_user, SYSUTCDATETIME(), NULL);

  DECLARE @uid INT = CAST(SCOPE_IDENTITY() AS INT);

  INSERT INTO dbo.usuarios_roles (id_usuario, id_rol, usuario, fecha_actualizacion)
  SELECT @uid, r.id_rol, @demo_user, SYSUTCDATETIME()
  FROM dbo.roles AS r
  WHERE r.descripcion = N'AGUACATE';
END
GO

/* Comprobación rápida (opcional): debe devolver al menos una fila si el demo existe */
/*
DECLARE @e VARCHAR(255) = N'demo.aguacate@su-dominio.com';
DECLARE @p NVARCHAR(128) = N'CambieEstaClave123!';
SELECT u.id_usuario, u.email, u.nombre, u.interno,
       STUFF((
         SELECT ',' + r.descripcion
         FROM dbo.roles r
         INNER JOIN dbo.usuarios_roles ur ON ur.id_rol = r.id_rol AND ur.id_usuario = u.id_usuario
         ORDER BY r.id_rol
         FOR XML PATH(''), TYPE
       ).value('.', 'varchar(max)'), 1, 1, '') AS roles
FROM dbo.usuarios u
WHERE u.email = @e AND PWDCOMPARE(@p, u.password) = 1;
*/
