-- HU-2 Catálogo de servicios (mockups p12 a p16).
-- La base usa utf8mb4_unicode_ci: los UNIQUE de nombres no distinguen mayúsculas ni tildes, igual que el frontend.

-- categoría principal; las inactivas no reciben tickets nuevos
CREATE TABLE categorias (
  id VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  descripcion VARCHAR(240) NOT NULL DEFAULT '',
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  prioridad_por_defecto ENUM('critica', 'alta', 'media', 'baja') NOT NULL,
  tiempo_esperado_horas SMALLINT UNSIGNED NOT NULL
);

-- el nombre se puede repetir, pero no dentro de la misma categoría
CREATE TABLE subcategorias (
  id VARCHAR(10) PRIMARY KEY,
  categoria_id VARCHAR(10) NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  descripcion VARCHAR(240) NOT NULL DEFAULT '',
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  prioridad_por_defecto ENUM('critica', 'alta', 'media', 'baja') NOT NULL,
  tiempo_esperado_horas SMALLINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_subcategorias_nombre (categoria_id, nombre),
  CONSTRAINT fk_subcategorias_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id)
);

CREATE TABLE sedes (
  id VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE pabellones (
  id VARCHAR(10) PRIMARY KEY,
  sede_id VARCHAR(10) NOT NULL,
  nombre VARCHAR(30) NOT NULL,
  UNIQUE KEY uq_pabellones_nombre (sede_id, nombre),
  CONSTRAINT fk_pabellones_sede FOREIGN KEY (sede_id) REFERENCES sedes (id)
);

-- el código va en mayúsculas, como A-201 o BIB-P2
CREATE TABLE ambientes (
  id VARCHAR(10) PRIMARY KEY,
  codigo VARCHAR(12) NOT NULL UNIQUE,
  nombre VARCHAR(80) NOT NULL,
  tipo ENUM('aula', 'laboratorio', 'auditorio', 'oficina', 'biblioteca') NOT NULL,
  pabellon_id VARCHAR(10) NOT NULL,
  piso TINYINT NOT NULL,
  capacidad SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT fk_ambientes_pabellon FOREIGN KEY (pabellon_id) REFERENCES pabellones (id)
);

-- La tabla habilitaciones está en 06-hu2-habilitaciones.sql porque apunta a usuarios (03-hu1-cuentas.sql).
