import { pool, siguienteId } from '../db/pool.js'

const aEvento = (fila) => ({
  id: fila.id,
  ticketId: fila.ticket_id,
  tipo: fila.tipo,
  estado: fila.estado,
  asignadoA: fila.asignado_a,
  autorId: fila.autor_id,
  motivo: fila.motivo,
  retornoEstimado: fila.retorno_estimado,
  solucion: fila.solucion,
  prioridadAnterior: fila.prioridad_anterior,
  prioridadNueva: fila.prioridad_nueva,
  creadoEn: fila.creado_en,
})

// Historial de los tickets (HU-4); db puede ser el pool o la conexión de una transacción
export const historialRepository = {
  // eventos de varios tickets, del más antiguo al más reciente
  async listarDe(ticketIds, { tipo } = {}, db = pool) {
    if (ticketIds.length === 0) return []
    const [filas] = tipo
      ? await db.query('SELECT * FROM historial WHERE ticket_id IN (?) AND tipo = ? ORDER BY creado_en, id', [ticketIds, tipo])
      : await db.query('SELECT * FROM historial WHERE ticket_id IN (?) ORDER BY creado_en, id', [ticketIds])
    return filas.map(aEvento)
  },

  async insertar(evento, db = pool) {
    const id = await siguienteId(db, 'historial', 'his')
    await db.query(
      `INSERT INTO historial (id, ticket_id, tipo, estado, asignado_a, autor_id, motivo, prioridad_anterior, prioridad_nueva, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, evento.ticketId, evento.tipo, evento.estado ?? null, evento.asignadoA ?? null, evento.autorId,
        evento.motivo ?? null, evento.prioridadAnterior ?? null, evento.prioridadNueva ?? null, evento.creadoEn ?? new Date(),
      ],
    )
    return id
  },
}

// HU-4 solo agrega la nota interna de la asignación a la bitácora de HU-5
export const bitacoraRepository = {
  async insertarNotaInterna({ ticketId, autorId, mensaje }, db = pool) {
    const id = await siguienteId(db, 'bitacora', 'bit')
    await db.query(
      "INSERT INTO bitacora (id, ticket_id, autor_id, tipo, mensaje, creado_en) VALUES (?, ?, ?, 'interno', ?, ?)",
      [id, ticketId, autorId, mensaje, new Date()],
    )
    return id
  },
}
