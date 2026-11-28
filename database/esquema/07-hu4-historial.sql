-- HU-4 Cola y asignación: historial del ticket (mockups p22 a p24 y p27).
-- Una fila por evento: cambio de estado, asignación (o devolución a la cola, con asignado_a vacío) y cambio de prioridad.
-- HU-3 agrega el registro, la cancelación y la reapertura; HU-5 agrega los cambios de estado.

CREATE TABLE historial (
  id VARCHAR(12) PRIMARY KEY,
  ticket_id VARCHAR(12) NOT NULL,
  tipo ENUM('estado', 'asignacion', 'prioridad') NOT NULL,
  -- tipo 'estado': el estado al que pasó el ticket
  estado VARCHAR(20) NULL,
  -- tipo 'asignacion': el técnico nuevo; NULL cuando el ticket se devuelve a la cola
  asignado_a VARCHAR(10) NULL,
  autor_id VARCHAR(10) NOT NULL,
  -- motivo de la reasignación, del cambio de prioridad o de la espera
  motivo VARCHAR(240) NULL,
  retorno_estimado DATETIME NULL,
  solucion TEXT NULL,
  -- tipo 'prioridad'
  prioridad_anterior ENUM('critica', 'alta', 'media', 'baja') NULL,
  prioridad_nueva ENUM('critica', 'alta', 'media', 'baja') NULL,
  creado_en DATETIME NOT NULL,
  KEY ix_historial_ticket (ticket_id, creado_en),
  CONSTRAINT fk_historial_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_historial_asignado FOREIGN KEY (asignado_a) REFERENCES usuarios (id),
  CONSTRAINT fk_historial_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id)
);
