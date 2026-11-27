-- HU-2: técnicos habilitados por categoría (mockup p16).
-- Va después de 03-hu1-cuentas.sql porque necesita la tabla usuarios.

-- si se elimina la categoría, sus habilitaciones se van con ella
CREATE TABLE habilitaciones (
  id VARCHAR(10) PRIMARY KEY,
  tecnico_id VARCHAR(10) NOT NULL,
  categoria_id VARCHAR(10) NOT NULL,
  UNIQUE KEY uq_habilitaciones_tecnico_categoria (tecnico_id, categoria_id),
  CONSTRAINT fk_habilitaciones_tecnico FOREIGN KEY (tecnico_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_habilitaciones_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE CASCADE
);
