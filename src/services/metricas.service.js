import { Op } from 'sequelize'
import { db } from '../repositories/RepositoryBase.js'

const ESTADOS_ABIERTOS = new Set(['abierto', 'asignado', 'en_atencion', 'en_espera', 'pendiente'])
const ESTADOS_RESUELTOS = new Set(['resuelto', 'cerrado'])

function calcularHoras(inicio, fin) {
  if (!inicio || !fin) return null
  const diffMs = new Date(fin).getTime() - new Date(inicio).getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return null
  return +(diffMs / 3600000).toFixed(2)
}

function construirFiltroTickets({ fechaDesde, fechaHasta, categoriaId, sedeId }) {
  const where = {}
  if (categoriaId) where.categoriaId = categoriaId
  if (fechaDesde || fechaHasta) {
    where.creadoEn = {}
    if (fechaDesde) where.creadoEn[Op.gte] = new Date(`${fechaDesde}T00:00:00`)
    if (fechaHasta) where.creadoEn[Op.lte] = new Date(`${fechaHasta}T23:59:59.999`)
  }
  const include = [
    { model: db.categoria, as: 'categoria', attributes: ['id', 'nombre'] },
    { model: db.usuario, as: 'tecnico', attributes: ['id', 'nombres', 'apellidos', 'correo', 'estado'] },
    { model: db.encuesta, as: 'encuesta', attributes: ['id', 'calificacion', 'comentario'] },
    {
      model: db.ambiente,
      as: 'ambiente',
      attributes: ['id', 'nombre', 'pabellonId'],
      required: Boolean(sedeId),
      include: sedeId
        ? [{ model: db.pabellon, as: 'pabellon', attributes: ['id', 'sedeId'], where: { sedeId }, required: true }]
        : [],
    },
  ]
  return { where, include }
}

export async function obtenerTablero(filtros = {}) {
  const { where, include } = construirFiltroTickets(filtros)
  const tickets = await db.ticket.findAll({ where, include, order: [['creadoEn', 'DESC']] })

  const total = tickets.length
  let abiertos = 0
  let resueltos = 0
  const tiemposResolucion = []
  const notasSatisfaccion = []

  const porCategoriaMap = new Map()
  const porEstadoMap = new Map()
  const porPrioridadMap = new Map()

  for (const t of tickets) {
    const estado = (t.estado ?? 'abierto').toLowerCase()
    if (ESTADOS_RESUELTOS.has(estado)) resueltos += 1
    else if (ESTADOS_ABIERTOS.has(estado)) abiertos += 1

    const horas = calcularHoras(t.creadoEn, t.cerradoEn)
    if (horas !== null) tiemposResolucion.push(horas)

    if (t.encuesta?.calificacion != null) {
      notasSatisfaccion.push(Number(t.encuesta.calificacion))
    }

    const catNombre = t.categoria?.nombre ?? t.categoriaId ?? 'Sin categoría'
    porCategoriaMap.set(catNombre, (porCategoriaMap.get(catNombre) ?? 0) + 1)
    porEstadoMap.set(estado, (porEstadoMap.get(estado) ?? 0) + 1)

    const prio = (t.prioridad ?? 'media').toLowerCase()
    porPrioridadMap.set(prio, (porPrioridadMap.get(prio) ?? 0) + 1)
  }

  const tiempoPromedioHoras = tiemposResolucion.length
    ? +(tiemposResolucion.reduce((a, b) => a + b, 0) / tiemposResolucion.length).toFixed(2)
    : 0

  const satisfaccionPromedio = notasSatisfaccion.length
    ? +(notasSatisfaccion.reduce((a, b) => a + b, 0) / notasSatisfaccion.length).toFixed(2)
    : 0

  return {
    resumen: {
      totalTickets: total,
      ticketsAbiertos: abiertos,
      ticketsResueltos: resueltos,
      tiempoPromedioHoras,
      satisfaccionPromedio,
      totalEncuestas: notasSatisfaccion.length,
    },
    porCategoria: Array.from(porCategoriaMap, ([categoria, cantidad]) => ({ categoria, cantidad })),
    porEstado: Array.from(porEstadoMap, ([estado, cantidad]) => ({ estado, cantidad })),
    porPrioridad: Array.from(porPrioridadMap, ([prioridad, cantidad]) => ({ prioridad, cantidad })),
  }
}

export async function obtenerCargaTecnicos(filtros = {}) {
  const tecnicos = await db.usuario.findAll({
    where: { rol: 'tecnico' },
    attributes: ['id', 'nombres', 'apellidos', 'correo', 'estado', 'especialidades'],
    order: [['nombres', 'ASC']],
  })

  const { where, include } = construirFiltroTickets(filtros)
  const tickets = await db.ticket.findAll({
    where: { ...where, asignadoA: { [Op.ne]: null } },
    include,
  })

  const mapaCarga = new Map()
  for (const tec of tecnicos) {
    mapaCarga.set(tec.id, {
      tecnicoId: tec.id,
      nombre: `${tec.nombres} ${tec.apellidos}`.trim(),
      correo: tec.correo,
      estado: tec.estado,
      especialidades: tec.especialidades ?? [],
      asignados: 0,
      enProceso: 0,
      resueltos: 0,
      tiempos: [],
    })
  }

  for (const t of tickets) {
    const item = mapaCarga.get(t.asignadoA)
    if (!item) continue
    item.asignados += 1
    const estado = (t.estado ?? '').toLowerCase()
    if (ESTADOS_RESUELTOS.has(estado)) {
      item.resueltos += 1
      const horas = calcularHoras(t.creadoEn, t.cerradoEn)
      if (horas !== null) item.tiempos.push(horas)
    } else {
      item.enProceso += 1
    }
  }

  return Array.from(mapaCarga.values()).map(({ tiempos, ...rest }) => ({
    ...rest,
    tiempoPromedioHoras: tiempos.length
      ? +(tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(2)
      : 0,
  }))
}