import { Op } from 'sequelize'
import { RepositoryBase, db } from './RepositoryBase.js'

const ESTADOS_ABIERTOS = ['abierto', 'en_atencion', 'en_espera', 'reabierto']
const ESTADOS_EN_COLA = ['abierto', 'reabierto']

const tickets = new RepositoryBase(db.ticket)
const encuestas = new RepositoryBase(db.encuesta)
const historial = new RepositoryBase(db.historial)
const usuarios = new RepositoryBase(db.usuario)

// Conteos sobre tickets (HU-3), su historial (HU-4) y encuestas (HU-6), que HU-1 solo lee.
export const resumenRepository = {
  async contarTicketsDelUsuario(usuarioId) {
    const [reportados, abiertos] = await Promise.all([
      tickets.contar({ usuarioId }),
      tickets.contar({ usuarioId, estado: ESTADOS_ABIERTOS }),
    ])
    return { reportados, abiertos }
  },

  contarEncuestasRespondidas(usuarioId) {
    return encuestas.contar({ usuarioId })
  },

  // tickets cerrados desde la fecha indicada que aún no tienen encuesta (asociación ticket → encuesta), el más
  // antiguo primero
  cerradosSinEncuesta(usuarioId, desde) {
    return tickets.listar({
      attributes: ['codigo', 'cerradoEn'],
      include: [{ model: db.encuesta, as: 'encuesta', attributes: [], required: false }],
      where: { usuarioId, estado: 'cerrado', cerradoEn: { [Op.gte]: desde }, '$encuesta.id$': null },
      order: [['cerradoEn', 'ASC']],
    })
  },

  // los tickets del técnico con su estado, para los contadores de su menú
  ticketsAsignados(tecnicoId) {
    return tickets.listar({ attributes: ['id', 'estado'], where: { asignadoA: tecnicoId } })
  },

  // cuántos de esos tickets pasaron a resuelto entre las dos fechas
  async contarResueltosEntre(ticketIds, inicio, fin) {
    if (ticketIds.length === 0) return 0
    const eventos = await historial.listar({
      attributes: ['ticketId'],
      where: { ticketId: ticketIds, tipo: 'estado', estado: 'resuelto', creadoEn: { [Op.between]: [inicio, fin] } },
    })
    return new Set(eventos.map(({ ticketId }) => ticketId)).size
  },


  contarColaSinAsignar() {
    return tickets.contar({ asignadoA: null, estado: ESTADOS_EN_COLA })
  },

  contarNoCerrados() {
    return tickets.contar({ estado: { [Op.ne]: 'cerrado' } })
  },

  contarUsuarios() {
    return usuarios.contar({})
  },
}
