import { Op } from 'sequelize'
import { RepositoryBase, db } from './RepositoryBase.js'

// el nombre de quien invitó sale de la asociación invitacion → usuario (invitador)
const CON_INVITADOR = { include: [{ model: db.usuario, as: 'invitador', attributes: ['nombres', 'apellidos'] }] }

function aInvitacion(fila) {
  if (!fila) return null
  const { invitador, ...invitacion } = fila
  return { ...invitacion, invitadoPorNombre: invitador ? `${invitador.nombres} ${invitador.apellidos}` : null }
}

// HU-1: invitaciones para técnicos y supervisores (p07).
class InvitacionesRepository extends RepositoryBase {
  constructor() {
    super(db.invitacion)
  }

  // con bloquear, otra transacción no puede responder la misma invitación a la vez
  async buscarPorToken(token, t, { bloquear = false } = {}) {
    return aInvitacion(await this.buscarUno({ where: { token }, ...CON_INVITADOR }, t, { bloquear }))
  }

  hayPendiente(correo, ahora, t) {
    return this.existe({ correo, estado: 'pendiente', venceEn: { [Op.gte]: ahora } }, t)
  }

  async insertar(invitacion, t) {
    await this.crear({ ...invitacion, estado: 'pendiente' }, t)
  }

  async responder(id, estado, fecha, t) {
    await this.actualizar({ id }, { estado, respondidaEn: fecha }, t)
  }
}

export const invitacionesRepository = new InvitacionesRepository()
