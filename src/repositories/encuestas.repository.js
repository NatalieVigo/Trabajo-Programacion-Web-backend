import { Op } from 'sequelize'
import { RepositoryBase, db } from './RepositoryBase.js'

// HU-6: encuestas, con lo que muestran del ticket (HU-3), su técnico (HU-1) y su categoría (HU-2).
// t es la transacción opcional (ver RepositoryBase).
const encuestas = new RepositoryBase(db.encuesta)
const tickets = new RepositoryBase(db.ticket)

const CAMPOS = [
  'id',
  'ticketId',
  'usuarioId',
  'puntaje',
  'rapidez',
  'trato',
  'solucion',
  'comentario',
  'respondidaEn',
  'editadaEn',
]

// el ticket calificado, con su técnico y su categoría
const DEL_TICKET = {
  model: db.ticket,
  as: 'ticket',
  attributes: ['id', 'codigo', 'asunto', 'categoriaId', 'asignadoA'],
  include: [
    { model: db.usuario, as: 'tecnico', attributes: ['nombres', 'apellidos'] },
    { model: db.categoria, as: 'categoria', attributes: ['nombre'] },
  ],
}

const entre = (inicio, fin) => ({ [Op.between]: [inicio, fin] })

export const encuestasRepository = {
  // lo que se revisa del ticket antes de responder su encuesta
  buscarTicket(codigo, t) {
    return tickets.buscarUno({ attributes: ['id', 'codigo', 'usuarioId', 'estado', 'cerradoEn'], where: { codigo } }, t)
  },

  buscarDelTicket(ticketId, t) {
    return encuestas.buscarUno({ attributes: CAMPOS, where: { ticketId } }, t)
  },

  // las que respondió una persona, de la más reciente a la más antigua
  listarDeUsuario(usuarioId, t) {
    return encuestas.listar(
      { attributes: CAMPOS, where: { usuarioId }, include: [DEL_TICKET], order: [['respondidaEn', 'DESC']] },
      t,
    )
  },

  listarRespondidasEntre(inicio, fin, t) {
    return encuestas.listar(
      {
        attributes: CAMPOS,
        where: { respondidaEn: entre(inicio, fin) },
        include: [DEL_TICKET],
        order: [['respondidaEn', 'DESC'], ['id', 'ASC']],
      },
      t,
    )
  },

  // los tickets cerrados en el periodo y si ya tienen encuesta, para la tasa de respuesta
  listarCerradosEntre(inicio, fin, t) {
    return tickets.listar(
      {
        attributes: ['id'],
        where: { estado: 'cerrado', cerradoEn: entre(inicio, fin) },
        include: [{ model: db.encuesta, as: 'encuesta', attributes: ['id'], required: false }],
      },
      t,
    )
  },

  async insertar(encuesta, t) {
    await encuestas.crear(encuesta, t)
  },

  async actualizar(id, cambios, t) {
    await encuestas.actualizar({ id }, cambios, t)
  },

  // ids del contrato de datos, como 'enc-008'
  nuevoId(t) {
    return encuestas.siguienteId('enc', t)
  },
}
