import { Op } from 'sequelize'
import { RepositoryBase, db } from './RepositoryBase.js'

// HU-4: lo que la cola lee y escribe en tickets (HU-3), con los nombres de catálogo y personas que muestra.
// t es la transacción opcional (ver RepositoryBase).
const tickets = new RepositoryBase(db.ticket)
const categorias = new RepositoryBase(db.categoria)
const ambientes = new RepositoryBase(db.ambiente)

const PERSONA = ['nombres', 'apellidos']

// datos relacionados de cada fila de la cola (asociaciones del modelo ticket)
const INCLUIR = [
  { model: db.categoria, as: 'categoria', attributes: ['nombre', 'tiempoEsperadoHoras'] },
  { model: db.subcategoria, as: 'subcategoria', attributes: ['nombre', 'tiempoEsperadoHoras'] },
  { model: db.ambiente, as: 'ambiente', attributes: ['codigo', 'nombre'] },
  { model: db.usuario, as: 'solicitante', attributes: PERSONA },
  { model: db.usuario, as: 'tecnico', attributes: PERSONA },
]

export const colaRepository = {
  // filtros: estados (lista), asignadoA (id) o sinAsignar (true)
  listarTickets({ estados, asignadoA, sinAsignar } = {}, t) {
    const where = {}
    if (estados?.length) where.estado = { [Op.in]: estados }
    if (asignadoA) where.asignadoA = asignadoA
    if (sinAsignar) where.asignadoA = null
    return tickets.listar({ where, include: INCLUIR, order: [['creadoEn', 'ASC']] }, t)
  },

  // lee y bloquea cada ticket (FOR UPDATE) hasta que termine la transacción, así dos supervisores no lo cambian a la vez
  async bloquearTickets(ids, t) {
    const filas = []
    for (const id of ids) {
      const ticket = await tickets.buscarPorId(id, t, { bloquear: true })
      if (ticket) filas.push(ticket)
    }
    return filas
  },

  asignar(id, tecnicoId, t) {
    return tickets.actualizar({ id }, { asignadoA: tecnicoId }, t)
  },

  cambiarPrioridad(id, prioridad, horas, t) {
    return tickets.actualizar({ id }, { prioridad, tiempoEsperadoHoras: horas }, t)
  },

  // vuelve a la cola: sin técnico y abierto
  devolver(id, t) {
    return tickets.actualizar({ id }, { asignadoA: null, estado: 'abierto', cerradoEn: null }, t)
  },

  categorias(t) {
    return categorias.listar({ attributes: ['id', 'nombre'], order: [['nombre', 'ASC']] }, t)
  },

  async ambientes(t) {
    const filas = await ambientes.listar({ attributes: ['id', 'codigo'], order: [['codigo', 'ASC']] }, t)
    return filas.map(({ id, codigo }) => ({ id, nombre: codigo }))
  },
}
