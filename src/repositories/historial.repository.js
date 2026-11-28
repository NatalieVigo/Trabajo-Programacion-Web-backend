import { Op } from 'sequelize'
import { RepositoryBase, db } from './RepositoryBase.js'

// HU-4: historial de los tickets. t es la transacción opcional (ver RepositoryBase).
const historial = new RepositoryBase(db.historial)
// HU-5: HU-4 solo agrega la nota interna de la asignación
const bitacora = new RepositoryBase(db.bitacora)

export const historialRepository = {
  // eventos de varios tickets, del más antiguo al más reciente
  listarDe(ticketIds, { tipo } = {}, t) {
    if (ticketIds.length === 0) return []
    const where = { ticketId: { [Op.in]: ticketIds } }
    if (tipo) where.tipo = tipo
    return historial.listar({ where, order: [['creadoEn', 'ASC'], ['id', 'ASC']] }, t)
  },

  async insertar(evento, t) {
    const id = await historial.siguienteId('his', t)
    return historial.crear({ id, creadoEn: new Date(), ...evento }, t)
  },
}

export const bitacoraRepository = {
  async insertarNotaInterna({ ticketId, autorId, mensaje }, t) {
    const id = await bitacora.siguienteId('bit', t)
    return bitacora.crear({ id, ticketId, autorId, tipo: 'interno', mensaje, creadoEn: new Date() }, t)
  },
}
