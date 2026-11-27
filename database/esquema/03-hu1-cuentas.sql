-- HU-1 Cuenta y acceso (mockups p03 a p11).

-- la contraseña se guarda cifrada con bcrypt (§7), nunca en texto plano;
-- especialidades: ids de las categorías que eligió el técnico o supervisor al aceptar la invitación (p07), como en el seed
CREATE TABLE usuarios (
  id VARCHAR(10) PRIMARY KEY,
  nombres VARCHAR(60) NOT NULL,
  apellidos VARCHAR(60) NOT NULL,
  correo VARCHAR(120) NOT NULL UNIQUE,
  telefono CHAR(9) NOT NULL,
  rol ENUM('usuario', 'tecnico', 'supervisor') NOT NULL,
  unidad VARCHAR(80) NOT NULL,
  vinculo VARCHAR(40) NULL,
  especialidades JSON NOT NULL,
  ambiente_habitual_id VARCHAR(10) NULL,
  estado ENUM('activo', 'bloqueado') NOT NULL DEFAULT 'activo',
  motivo_bloqueo VARCHAR(255) NULL,
  password_hash VARCHAR(100) NOT NULL,
  intentos_fallidos INT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  acepta_terminos BOOLEAN NOT NULL,
  invitacion_id VARCHAR(10) NULL,
  ultimo_acceso_en DATETIME NULL,
  creado_en DATETIME NOT NULL,
  actualizado_en DATETIME NOT NULL,
  CONSTRAINT fk_usuarios_unidad FOREIGN KEY (unidad) REFERENCES unidades (nombre),
  CONSTRAINT fk_usuarios_vinculo FOREIGN KEY (vinculo) REFERENCES vinculos (nombre),
  CONSTRAINT fk_usuarios_ambiente FOREIGN KEY (ambiente_habitual_id) REFERENCES ambientes (id) ON DELETE SET NULL
);

-- 'vencida' no se guarda: se calcula con vence_en
CREATE TABLE invitaciones (
  id VARCHAR(10) PRIMARY KEY,
  token VARCHAR(40) NOT NULL UNIQUE,
  nombres VARCHAR(60) NOT NULL,
  apellidos VARCHAR(60) NOT NULL,
  correo VARCHAR(120) NOT NULL,
  rol ENUM('tecnico', 'supervisor') NOT NULL,
  telefono CHAR(9) NOT NULL,
  invitado_por VARCHAR(10) NOT NULL,
  estado ENUM('pendiente', 'aceptada', 'rechazada', 'revocada') NOT NULL DEFAULT 'pendiente',
  vence_en DATETIME NOT NULL,
  creada_en DATETIME NOT NULL,
  respondida_en DATETIME NULL,
  INDEX idx_invitaciones_correo (correo),
  CONSTRAINT fk_invitaciones_invitador FOREIGN KEY (invitado_por) REFERENCES usuarios (id)
);

ALTER TABLE usuarios
  ADD CONSTRAINT fk_usuarios_invitacion FOREIGN KEY (invitacion_id) REFERENCES invitaciones (id);

-- enlaces de recuperación de contraseña (p08 y p09): duran 30 minutos y sirven una sola vez
CREATE TABLE tokens_recuperacion (
  token CHAR(36) PRIMARY KEY,
  usuario_id VARCHAR(10) NOT NULL,
  creado_en DATETIME NOT NULL,
  vence_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  CONSTRAINT fk_tokens_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);

-- fallos con correos sin cuenta: se bloquean igual para no revelar qué correos están registrados
CREATE TABLE intentos_acceso (
  correo VARCHAR(120) PRIMARY KEY,
  intentos_fallidos INT UNSIGNED NOT NULL,
  bloqueado_hasta DATETIME NULL
);

-- pedidos de acceso desde la vista 403 (p11)
CREATE TABLE solicitudes_acceso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id VARCHAR(10) NOT NULL,
  recurso VARCHAR(120) NOT NULL,
  creada_en DATETIME NOT NULL,
  UNIQUE KEY uq_solicitudes_usuario_recurso (usuario_id, recurso),
  CONSTRAINT fk_solicitudes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);
