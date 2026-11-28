import { Op } from 'sequelize'
import { RepositoryBase, db } from './RepositoryBase.js'

// HU-7: lo que el tablero y la carga por técnico leen de otras historias, sin modificarlo: tickets (HU-3),
// historial (HU-4), catálogo y habilitaciones (HU-2), cuentas (HU-1) y encuestas (HU-6).
// t es la transacción opcional (ver RepositoryBase).
const tickets = new RepositoryBase(db.ticket)
const historial = new RepositoryBase(db.historial)
const categorias = new RepositoryBase(db.categoria)
const subcategorias = new RepositoryBase(db.subcategoria)
const ambientes = new RepositoryBase(db.ambiente)
const sedes = new RepositoryBase(db.sede)
const usuarios = new RepositoryBase(db.usuario)
const habilitaciones = new RepositoryBase(db.habilitacion)
const encuestas = new RepositoryBase(db.encuesta)

const POR_ID = [['id', 'ASC']]

const CAMPOS_TICKET = [
  'id',
  'codigo',
  'usuarioId',
  'categoriaId',
  'subcategoriaId',
  'ambienteId',
  'asignadoA',
  'estado',
  'prioridad',
  'tiempoEsperadoHoras',
  'creadoEn',
  'cerradoEn',
]

// el puntaje y la fecha de respuesta, como en el seed; HU-6 todavía no los agrega a la tabla
const CAMPOS_DE_LA_RESPUESTA = ['puntaje', 'respondidaEn']

export const metricasRepository = {
  listarTickets(t) {
    return tickets.listar({ attributes: CAMPOS_TICKET, order: POR_ID }, t)
  },

  // cambios de estado y asignaciones, del más antiguo al más reciente
  listarEventos(t) {
    return historial.listar(
      {
        attributes: ['ticketId', 'tipo', 'estado', 'asignadoA', 'creadoEn'],
        where: { tipo: { [Op.in]: ['estado', 'asignacion'] } },
        order: [['creadoEn', 'ASC'], ['id', 'ASC']],
      },
      t,
    )
  },

  listarCategorias(t) {
    return categorias.listar({ attributes: ['id', 'nombre', 'tiempoEsperadoHoras'], order: POR_ID }, t)
  },

  listarSubcategorias(t) {
    return subcategorias.listar({ attributes: ['id', 'tiempoEsperadoHoras'], order: POR_ID }, t)
  },

  listarAmbientes(t) {
    return ambientes.listar({ attributes: ['id', 'codigo', 'nombre'], order: POR_ID }, t)
  },

  async nombreDeLaSede(t) {
    const [sede] = await sedes.listar({ attributes: ['nombre'], order: POR_ID, limit: 1 }, t)
    return sede?.nombre ?? null
  },

  tecnicosActivos(t) {
    return usuarios.listar(
      {
        attributes: ['id', 'nombres', 'apellidos', 'especialidades'],
        where: { rol: 'tecnico', estado: 'activo' },
        order: POR_ID,
      },
      t,
    )
  },

  listarHabilitaciones(t) {
    return habilitaciones.listar({ attributes: ['tecnicoId', 'categoriaId'] }, t)
  },

  // mientras HU-6 no guarde el puntaje, no hay encuestas que promediar; también las usa la ficha de usuario
  async encuestasRespondidas({ usuarioId } = {}, t) {
    const columnas = db.encuesta.getAttributes()
    if (!CAMPOS_DE_LA_RESPUESTA.every((campo) => Object.hasOwn(columnas, campo))) return []
    const where = { puntaje: { [Op.ne]: null } }
    if (usuarioId) where.usuarioId = usuarioId
    return encuestas.listar({ attributes: ['ticketId', 'usuarioId', ...CAMPOS_DE_LA_RESPUESTA], where }, t)
  },
}
