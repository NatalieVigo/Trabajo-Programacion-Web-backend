-- HU-5 Atención y cierre (mínimo): solo las columnas que escribe HU-4 al asignar o reasignar con una nota interna.
-- El responsable de HU-5 completa el resto.

CREATE TABLE bitacora (
  id VARCHAR(12) PRIMARY KEY,
  ticket_id VARCHAR(12) NOT NULL,
  autor_id VARCHAR(10) NOT NULL,
  tipo ENUM('publico', 'interno') NOT NULL,
  mensaje TEXT NOT NULL,
  creado_en DATETIME NOT NULL,
  KEY ix_bitacora_ticket (ticket_id, creado_en),
  CONSTRAINT fk_bitacora_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_bitacora_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id)
);
