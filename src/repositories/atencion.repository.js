import { Op } from 'sequelize'
import { ESTADOS_EN_CURSO } from '../utils/estadosTicket.js'
import { RepositoryBase, db } from './RepositoryBase.js'

// HU-5 Atención y cierre: lee el ticket con sus asociaciones y escribe en la bitácora y en el estado del ticket.
// Los cambios de estado se guardan en el historial con historialRepository (HU-4). t es la transacción opcional.
const tickets = new RepositoryBase(db.ticket)
const bitacora = new RepositoryBase(db.bitacora)
const historial = new RepositoryBase(db.historial)

const PERSONA = ['id', 'nombres', 'apellidos', 'rol']
const POR_ANTIGUEDAD = [['creadoEn', 'ASC'], ['id', 'ASC']]
const TIEMPO_ESPERADO = ['id', 'nombre', 'tiempoEsperadoHoras']

// lo que muestra la cabecera de la atención (p25): reporte, ambiente con su pabellón y sede, y las personas
const DETALLE = [
  { model: db.categoria, as: 'categoria', attributes: TIEMPO_ESPERADO },
  { model: db.subcategoria, as: 'subcategoria', attributes: TIEMPO_ESPERADO },
  {
    model: db.ambiente,
    as: 'ambiente',
    attributes: ['id', 'codigo', 'nombre', 'tipo', 'piso', 'capacidad'],
    include: [
      { model: db.pabellon, as: 'pabellon', attributes: ['nombre'], include: [{ model: db.sede, as: 'sede', attributes: ['nombre'] }] },
    ],
  },
  { model: db.usuario, as: 'solicitante', attributes: [...PERSONA, 'telefono'] },
  { model: db.usuario, as: 'tecnico', attributes: PERSONA },
]

export const atencionRepository = {
  // solo la fila del ticket; con bloquear nadie más lo cambia hasta que termine la transacción
  buscarTicket(codigo, t, { bloquear = false } = {}) {
    return tickets.buscarUno({ where: { codigo } }, t, { bloquear })
  },

  buscarConDetalle(codigo) {
    return tickets.buscarUno({ where: { codigo }, include: DETALLE })
  },

  // cuántos tickets siguen en curso en el ambiente y cuándo se cerró el último
  async resumenDelAmbiente(ambienteId) {
    const [enCurso, ultimo] = await Promise.all([
      tickets.contar({ ambienteId, estado: ESTADOS_EN_CURSO }),
      tickets.buscarUno({
        attributes: ['cerradoEn'],
        where: { ambienteId, cerradoEn: { [Op.ne]: null } },
        order: [['cerradoEn', 'DESC']],
      }),
    ])
    return { enCurso, ultimoCierre: ultimo?.cerradoEn ?? null }
  },

  bitacoraDe(ticketId) {
    return bitacora.listar({
      where: { ticketId },
      include: [{ model: db.usuario, as: 'autor', attributes: PERSONA }],
      order: POR_ANTIGUEDAD,
    })
  },

  // todos los eventos del historial (estado, asignación y prioridad) con su autor y el técnico asignado
  eventosDe(ticketId) {
    return historial.listar({
      where: { ticketId },
      include: [
        { model: db.usuario, as: 'autor', attributes: PERSONA },
        { model: db.usuario, as: 'asignado', attributes: PERSONA },
      ],
      order: POR_ANTIGUEDAD,
    })
  },

  async insertarEntrada(entrada, t) {
    const id = await bitacora.siguienteId('bit', t)
    return bitacora.crear({ id, ...entrada }, t)
  },

  guardarEstado(ticketId, { estado, cerradoEn }, t) {
    return tickets.actualizar({ id: ticketId }, { estado, cerradoEn }, t)
  },

  // tickets que tiene o tuvo el técnico (p24)
  atendidosPor(tecnicoId) {
    return tickets.listar({
      where: { asignadoA: tecnicoId },
      include: [
        { model: db.categoria, as: 'categoria', attributes: TIEMPO_ESPERADO },
        { model: db.subcategoria, as: 'subcategoria', attributes: TIEMPO_ESPERADO },
        { model: db.ambiente, as: 'ambiente', attributes: ['id', 'codigo'] },
        { model: db.usuario, as: 'solicitante', attributes: PERSONA },
      ],
    })
  },

  // fechas de la bitácora y del historial de esos tickets, para saber cuándo se movió cada uno por última vez
  async fechasDeActividad(ticketIds) {
    if (ticketIds.length === 0) return []
    const consulta = { attributes: ['ticketId', 'creadoEn'], where: { ticketId: { [Op.in]: ticketIds } } }
    const [notas, eventos] = await Promise.all([bitacora.listar(consulta), historial.listar(consulta)])
    return [...notas, ...eventos]
  },
}
