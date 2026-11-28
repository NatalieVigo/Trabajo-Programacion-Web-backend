import { Op } from 'sequelize'
import { RepositoryBase, db } from './RepositoryBase.js'

// HU-7: cuentas (HU-1) con los tickets (HU-3) y el catálogo (HU-2) que muestra la gestión de usuarios. HU-7 solo
// escribe el estado y el motivo del bloqueo. t es la transacción opcional (ver RepositoryBase).
const usuarios = new RepositoryBase(db.usuario)
const tickets = new RepositoryBase(db.ticket)
const categorias = new RepositoryBase(db.categoria)
const subcategorias = new RepositoryBase(db.subcategoria)
const ambientes = new RepositoryBase(db.ambiente)

const POR_ID = [['id', 'ASC']]

// nunca el hash de la contraseña ni los intentos fallidos
const CAMPOS_CUENTA = [
  'id',
  'nombres',
  'apellidos',
  'correo',
  'telefono',
  'rol',
  'unidad',
  'vinculo',
  'especialidades',
  'ambienteHabitualId',
  'estado',
  'motivoBloqueo',
  'ultimoAccesoEn',
  'creadoEn',
]

const CAMPOS_TICKET = [
  'id',
  'codigo',
  'asunto',
  'usuarioId',
  'asignadoA',
  'categoriaId',
  'subcategoriaId',
  'ambienteId',
  'prioridad',
  'estado',
  'creadoEn',
]

export const administracionUsuariosRepository = {
  listarCuentas(t) {
    return usuarios.listar({ attributes: CAMPOS_CUENTA, order: POR_ID }, t)
  },

  buscarCuenta(id, t) {
    return usuarios.buscarUno({ attributes: CAMPOS_CUENTA, where: { id } }, t)
  },

  // filtros: usuarioId (quien lo reportó) o asignadoA (el técnico)
  listarTickets({ usuarioId, asignadoA } = {}, t) {
    const where = {}
    if (usuarioId) where.usuarioId = usuarioId
    if (asignadoA) where.asignadoA = asignadoA
    return tickets.listar({ attributes: CAMPOS_TICKET, where, order: POR_ID }, t)
  },

  listarCategorias(t) {
    return categorias.listar({ attributes: ['id', 'nombre'], order: POR_ID }, t)
  },

  listarSubcategorias(ids, t) {
    if (ids.length === 0) return []
    return subcategorias.listar({ attributes: ['id', 'nombre'], where: { id: { [Op.in]: ids } } }, t)
  },

  listarAmbientes(ids, t) {
    if (ids.length === 0) return []
    return ambientes.listar({ attributes: ['id', 'codigo', 'nombre'], where: { id: { [Op.in]: ids } } }, t)
  },

  async bloquear(id, motivo, fecha, t) {
    await usuarios.actualizar({ id }, { estado: 'bloqueado', motivoBloqueo: motivo, actualizadoEn: fecha }, t)
  },

  async desbloquear(id, fecha, t) {
    await usuarios.actualizar({ id }, { estado: 'activo', motivoBloqueo: null, actualizadoEn: fecha }, t)
  },
}
