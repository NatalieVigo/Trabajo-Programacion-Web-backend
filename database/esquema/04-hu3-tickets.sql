-- HU-3 Registro de tickets. Por ahora solo las columnas que leen HU-1 (resumen de Mi cuenta y contadores)
-- y HU-2 (tickets por categoría, subcategoría y ambiente); el responsable de HU-3 completa el resto.

CREATE TABLE tickets (
  id VARCHAR(12) PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  usuario_id VARCHAR(10) NOT NULL,
  categoria_id VARCHAR(10) NOT NULL,
  subcategoria_id VARCHAR(10) NULL,
  ambiente_id VARCHAR(10) NOT NULL,
  asignado_a VARCHAR(10) NULL,
  estado VARCHAR(20) NOT NULL,
  cerrado_en DATETIME NULL,
  CONSTRAINT fk_tickets_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_tickets_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT fk_tickets_subcategoria FOREIGN KEY (subcategoria_id) REFERENCES subcategorias (id),
  CONSTRAINT fk_tickets_ambiente FOREIGN KEY (ambiente_id) REFERENCES ambientes (id),
  CONSTRAINT fk_tickets_tecnico FOREIGN KEY (asignado_a) REFERENCES usuarios (id)
);
