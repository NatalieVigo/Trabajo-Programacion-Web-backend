import { metricasRepository } from '../repositories/metricas.repository.js'
import { ESTADOS_EN_CURSO } from '../utils/estadosTicket.js'
import { esFechaDeCalendario, fechaEnLima } from '../utils/fechaLima.js'
import { validationError } from '../utils/ServiceError.js'
import { tiemposDe } from '../utils/tiemposDeAtencion.js'
import { HORAS_POR_PRIORIDAD } from './cola.service.js'

// HU-7 Tablero de métricas (p30) y carga por técnico (p31), con los mismos cálculos que el frontend de la entrega 1.
const HORA_MS = 3_600_000
const DIA_MS = 24 * HORA_MS

// las barras de la gráfica de estados
const GRUPOS_DE_ESTADO = Object.freeze([
  ['abierto', 'Abierto', ['abierto', 'reabierto']],
  ['en_atencion', 'En atención', ['en_atencion']],
  ['en_espera', 'En espera', ['en_espera']],
  ['cerrado', 'Resuelto y cerrado', ['resuelto', 'cerrado']],
])

const enCurso = (ticket) => ESTADOS_EN_CURSO.includes(ticket.estado)
const iso = (fecha) => (fecha ? new Date(fecha).toISOString() : null)
const enRango = (fecha, rango) => Boolean(fecha) && fechaEnLima(fecha) >= rango.desde && fechaEnLima(fecha) <= rango.hasta
const promedio = (valores) => (valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null)
// como getDisplayName del frontend: primer nombre y apellidos
const nombreCorto = ({ nombres, apellidos }) => `${nombres.split(' ')[0]} ${apellidos}`.trim()

// el rango llega como ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD, en días de Lima
export function validarRango({ desde, hasta } = {}) {
  if (!esFechaDeCalendario(desde) || !esFechaDeCalendario(hasta) || desde > hasta) {
    throw validationError({ periodo: 'Elige fechas válidas y una fecha final igual o posterior a la inicial.' })
  }
  return { desde, hasta }
}

// el periodo de la misma duración justo antes, para las variaciones
function periodoAnterior({ desde, hasta }) {
  const inicio = Date.parse(`${desde}T00:00:00-05:00`)
  const dias = Math.round((Date.parse(`${hasta}T00:00:00-05:00`) - inicio) / DIA_MS) + 1
  return { desde: fechaEnLima(inicio - dias * DIA_MS), hasta: fechaEnLima(inicio - DIA_MS) }
}

// el técnico que lo tenía al resolverlo, aunque luego lo reasignen
function tecnicoEn(ticket, eventos, instante) {
  const asignaciones = eventos.filter((e) => e.tipo === 'asignacion' && e.creadoEn <= instante)
  return asignaciones.length ? asignaciones.at(-1).asignadoA : ticket.asignadoA
}

function agruparPorTicket(eventos) {
  const grupos = new Map()
  for (const evento of eventos) {
    const lista = grupos.get(evento.ticketId) ?? []
    lista.push({ ...evento, creadoEn: iso(evento.creadoEn) })
    grupos.set(evento.ticketId, lista)
  }
  return grupos
}

// Cada ticket con sus resoluciones (puede resolverse, reabrirse y volver a resolverse), su tiempo de atención sin las
// esperas y si pasó el tiempo esperado. Las fechas quedan como texto ISO para compararlas.
async function actividad(ahora) {
  const [filas, eventos, categorias, subcategorias] = await Promise.all([
    metricasRepository.listarTickets(),
    metricasRepository.listarEventos(),
    metricasRepository.listarCategorias(),
    metricasRepository.listarSubcategorias(),
  ])
  const eventosDe = agruparPorTicket(eventos)
  const tickets = filas.map((fila) => {
    const ticket = { ...fila, creadoEn: iso(fila.creadoEn), cerradoEn: iso(fila.cerradoEn) }
    const propios = eventosDe.get(ticket.id) ?? []
    let estados = propios.filter((e) => e.tipo === 'estado')
    if (!estados.length || estados[0].creadoEn > ticket.creadoEn) {
      estados = [{ estado: 'abierto', creadoEn: ticket.creadoEn }, ...estados]
    }
    const medirHasta = (fin) => tiemposDe(estados.filter((e) => Date.parse(e.creadoEn) <= fin), fin).atencionMs
    const resolucion = (creadoEn) => ({
      creadoEn,
      tecnicoId: tecnicoEn(ticket, propios, creadoEn),
      atencionMs: medirHasta(Date.parse(creadoEn)),
    })
    const resoluciones = estados.filter((e) => e.estado === 'resuelto').map((e) => resolucion(e.creadoEn))
    if (!resoluciones.length && ticket.estado === 'cerrado' && ticket.cerradoEn) resoluciones.push(resolucion(ticket.cerradoEn))
    const ultima = resoluciones.at(-1)
    const fin = !enCurso(ticket) && ultima ? Date.parse(ultima.creadoEn) : ahora
    const atencionMs = medirHasta(fin)
    const catalogo =
      subcategorias.find((c) => c.id === ticket.subcategoriaId) ?? categorias.find((c) => c.id === ticket.categoriaId)
    const esperado = ticket.tiempoEsperadoHoras ?? catalogo?.tiempoEsperadoHoras ?? HORAS_POR_PRIORIDAD[ticket.prioridad]
    return { ...ticket, resoluciones, atencionMs, fueraDePlazo: atencionMs > esperado * HORA_MS }
  })
  return { tickets, categorias }
}

function resumenPeriodo(tickets, rango) {
  const registrados = tickets.filter((t) => enRango(t.creadoEn, rango))
  // reabrir no borra lo ya resuelto; cada ticket cuenta una vez por periodo
  const resueltos = tickets.flatMap((t) => {
    const resolucion = t.resoluciones.filter((r) => enRango(r.creadoEn, rango)).at(-1)
    return resolucion ? [{ ...t, tecnicoResolutorId: resolucion.tecnicoId, atencionMs: resolucion.atencionMs }] : []
  })
  return {
    registrados,
    resueltos,
    total: registrados.length,
    promedioMs: promedio(resueltos.map((t) => t.atencionMs)),
    fueraDePlazo: registrados.filter((t) => t.fueraDePlazo).length,
  }
}

// Tablero del periodo comparado con el periodo anterior. Abiertos y sin asignar son cifras de ahora, no del periodo.
export async function obtenerTablero(consulta, ahora = Date.now()) {
  const rango = validarRango(consulta)
  const [{ tickets, categorias }, ambientes, sede] = await Promise.all([
    actividad(ahora),
    metricasRepository.listarAmbientes(),
    metricasRepository.nombreDeLaSede(),
  ])
  const actual = resumenPeriodo(tickets, rango)
  const anterior = resumenPeriodo(tickets, periodoAnterior(rango))
  const abiertos = tickets.filter(enCurso)
  const contar = (filtro) => actual.registrados.filter(filtro).length
  const masUsados = ambientes
    .map((a) => ({ id: a.id, nombre: a.codigo ?? a.nombre, total: contar((t) => t.ambienteId === a.id) }))
    .filter((a) => a.total)
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre))
    .slice(0, 6)
  return {
    rango,
    actualizadoEn: new Date(ahora).toISOString(),
    sede: sede ?? 'Campus',
    total: actual.total,
    abiertos: abiertos.length,
    sinAsignar: abiertos.filter((t) => !t.asignadoA).length,
    promedioMs: actual.promedioMs,
    fueraDePlazo: actual.fueraDePlazo,
    porcentajeFuera: actual.total ? (actual.fueraDePlazo / actual.total) * 100 : 0,
    variacionTickets: anterior.total ? ((actual.total - anterior.total) / anterior.total) * 100 : null,
    variacionTiempoMs:
      actual.promedioMs !== null && anterior.promedioMs !== null ? actual.promedioMs - anterior.promedioMs : null,
    porEstado: GRUPOS_DE_ESTADO.map(([id, nombre, estados]) => ({
      id,
      nombre,
      total: contar((t) => estados.includes(t.estado)),
    })),
    porCategoria: categorias
      .map((cat) => ({ id: cat.id, nombre: cat.nombre, total: contar((t) => t.categoriaId === cat.id) }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre)),
    ambientes: masUsados,
  }
}

// el técnico con más carga y, si hay, uno con menos tickets habilitado para sus tickets críticos
function avisoDeCarga(filas, tickets, habilitaciones, totalAsignados) {
  const mayor = [...filas].sort((a, b) => b.asignados - a.asignados)[0]
  if (!mayor?.asignados) return 'No hay tickets en curso asignados a técnicos activos.'
  let aviso = `${mayor.nombre} concentra ${mayor.asignados} de los ${totalAsignados} tickets asignados.`
  const criticos = tickets.filter((t) => t.asignadoA === mayor.id && enCurso(t) && t.prioridad === 'critica')
  const habilitado = (fila, ticket) =>
    habilitaciones.some((h) => h.tecnicoId === fila.id && h.categoriaId === ticket.categoriaId)
  const candidato = [...filas]
    .sort((a, b) => a.asignados - b.asignados)
    .find((fila) => fila.id !== mayor.id && fila.asignados < mayor.asignados && criticos.some((t) => habilitado(fila, t)))
  if (candidato) {
    aviso += ` Considera repartir los tickets críticos con ${candidato.nombre}, que cuenta con habilitación compatible.`
  }
  return aviso
}

// Carga actual de cada técnico activo junto a sus resultados del periodo. La satisfacción es la de las encuestas
// respondidas en el periodo sobre tickets que resolvió ese técnico.
export async function obtenerCargaTecnicos(consulta, ahora = Date.now()) {
  const rango = validarRango(consulta)
  const [{ tickets, categorias }, tecnicos, habilitaciones, encuestas] = await Promise.all([
    actividad(ahora),
    metricasRepository.tecnicosActivos(),
    metricasRepository.listarHabilitaciones(),
    metricasRepository.encuestasRespondidas(),
  ])
  const resueltosDelPeriodo = resumenPeriodo(tickets, rango).resueltos
  const respondidas = encuestas
    .map((e) => ({ ticketId: e.ticketId, puntaje: Number(e.puntaje), respondidaEn: iso(e.respondidaEn) }))
    .filter((e) => enRango(e.respondidaEn, rango) && e.puntaje >= 1 && e.puntaje <= 5)
  const filas = tecnicos.map((tecnico) => {
    const propios = tickets.filter((t) => t.asignadoA === tecnico.id && enCurso(t))
    const resueltos = resueltosDelPeriodo.filter((t) => t.tecnicoResolutorId === tecnico.id)
    const puntajes = respondidas.flatMap((e) => {
      const ticket = tickets.find((t) => t.id === e.ticketId)
      const resolucion = ticket?.resoluciones.filter((r) => r.creadoEn <= e.respondidaEn).at(-1)
      return resolucion?.tecnicoId === tecnico.id ? [e.puntaje] : []
    })
    return {
      id: tecnico.id,
      nombre: nombreCorto(tecnico),
      especialidad: tecnico.especialidades
        .map((id) => categorias.find((cat) => cat.id === id)?.nombre)
        .filter(Boolean)
        .join(' · '),
      asignados: propios.length,
      resueltos: resueltos.length,
      enEspera: propios.filter((t) => t.estado === 'en_espera').length,
      promedioMs: promedio(resueltos.map((t) => t.atencionMs)),
      satisfaccion: promedio(puntajes),
    }
  })
  const totalAsignados = filas.reduce((total, fila) => total + fila.asignados, 0)
  return {
    filas,
    totalAsignados,
    promedioAsignados: filas.length ? totalAsignados / filas.length : 0,
    aviso: avisoDeCarga(filas, tickets, habilitaciones, totalAsignados),
  }
}
