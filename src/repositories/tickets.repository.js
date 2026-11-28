import { Op } from 'sequelize'
import { RepositoryBase, db } from './RepositoryBase.js'

const tickets = new RepositoryBase(db.ticket)
const relaciones = [
  { model: db.categoria, as: 'categoria', attributes: ['id', 'nombre'] },
  { model: db.subcategoria, as: 'subcategoria', attributes: ['id', 'nombre'] },
  { model: db.ambiente, as: 'ambiente', attributes: ['id', 'codigo', 'nombre'] },
]

export const ticketsRepository = {
  listarPorUsuario(usuarioId) {
    return tickets.listar({
      where: { usuarioId },
      include: relaciones,
      order: [['creadoEn', 'DESC'], ['id', 'DESC']],
    })
  },

  buscarRepetido({ categoriaId, ambienteId, estados }, usuarioId = null) {
    const where = {
      categoriaId,
      ambienteId,
      estado: { [Op.in]: estados },
    }
    if (usuarioId) where.usuarioId = usuarioId
    return tickets.buscarUno({
      where,
      order: [['creadoEn', 'DESC']],
    })
  },

  buscarPropio(idOCodigo, usuarioId, t, { bloquear = false } = {}) {
    return tickets.buscarUno(
      {
        where: {
          usuarioId,
          [Op.or]: [{ id: idOCodigo }, { codigo: idOCodigo }],
        },
      },
      t,
      { bloquear },
    )
  },

  actualizar(id, cambios, t) {
    return tickets.actualizar({ id }, cambios, t)
  },

  insertar(ticket, t) {
    return tickets.crear(ticket, t)
  },

  nuevoId(t) {
    return tickets.siguienteId('tck', t, 5)
  },
}
