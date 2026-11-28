import { atencionRepository } from '../repositories/atencion.repository.js'
import { historialRepository } from '../repositories/historial.repository.js'
import { enTransaccion } from '../repositories/RepositoryBase.js'
import {
  normalizeTexto,
  validateCambioEstado,
  validateCierre,
  validateEntrada,
  validateNuevoEstado,
} from '../utils/atencionValidators.js'
import { esTransicionValida, formatEstado, sePuedeCerrar, transicionesDesde } from '../utils/estadosTicket.js'
import { finDelDiaEnLima } from '../utils/fechaLima.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'
import { etapasDe, tiempoPorEstado, tiemposDe } from '../utils/tiemposDeAtencion.js'
import { hasErrors } from '../utils/validators.js'

// HU-5 Atención y cierre (mockups p24 a p27). Mismas reglas y mensajes que tenía el frontend en la entrega 1.

const HORA_MS = 60 * 60 * 1000

// estos roles ven las notas internas
const EQUIPO = Object.freeze(['tecnico', 'supervisor'])

// nunca se devuelve el correo ni la contraseña
const persona = (usuario) =>
  usuario ? { id: usuario.id, nombres: usuario.nombres, apellidos: usuario.apellidos, rol: usuario.rol } : null

const referencia = (fila) => (fila ? { id: fila.id, nombre: fila.nombre } : null)

const normalizarCodigo = (codigo) => String(codigo ?? '').trim().toUpperCase()

const ticketNoEncontrado = () => new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket con ese código.')

// solo el técnico asignado cambia el estado y lo cierra
function esSuTecnico(ticket, usuario) {
  return usuario.rol === 'tecnico' && ticket.asignadoA === usuario.id
}

// Qué puede hacer el usuario con el ticket; cerrado o cancelado ya no admite cambios.
function permisosSobre(ticket, usuario) {
  const esEquipo = EQUIPO.includes(usuario.rol)
  const loReporto = ticket.usuarioId === usuario.id
  if (!esEquipo && !loReporto) {
    throw new ServiceError(403, 'FORBIDDEN', 'No tienes permiso para ver este ticket.')
  }
  const admiteEntradas = !['cerrado', 'cancelado'].includes(ticket.estado)
  const loGestiona = esSuTecnico(ticket, usuario)
  const loAtiende = usuario.rol === 'supervisor' || loGestiona
  return {
    verInternas: esEquipo,
    comentar: admiteEntradas && (loAtiende || loReporto),
    notaInterna: admiteEntradas && loAtiende,
    transiciones: loGestiona ? [...transicionesDesde(ticket.estado)] : [],
    cerrar: loGestiona && sePuedeCerrar(ticket.estado),
  }
}

function resumirTicket(ticket, { enCurso, ultimoCierre }) {
  const { ambiente } = ticket
  const codigoAmbiente = ambiente?.codigo ?? 'Sin ambiente'
  return {
    id: ticket.id,
    codigo: ticket.codigo,
    asunto: ticket.asunto,
    // la descripción viene del registro (HU-3) y puede faltar
    descripcion: ticket.descripcion || null,
    estado: ticket.estado,
    prioridad: ticket.prioridad,
    creadoEn: ticket.creadoEn,
    cerradoEn: ticket.cerradoEn,
    categoria: referencia(ticket.categoria),
    subcategoria: referencia(ticket.subcategoria),
    ambiente: {
      id: ambiente?.id ?? ticket.ambienteId ?? null,
      codigo: codigoAmbiente,
      nombre: ambiente?.nombre ?? codigoAmbiente,
      tipo: ambiente?.tipo ?? null,
      piso: ambiente?.piso ?? null,
      capacidad: ambiente?.capacidad ?? null,
      pabellon: ambiente?.pabellon?.nombre ?? null,
      sede: ambiente?.pabellon?.sede?.nombre ?? null,
      ticketsEnCurso: enCurso,
      ultimoCierre,
    },
    // el teléfono sirve para coordinar el acceso al ambiente
    solicitante: { ...persona(ticket.solicitante), telefono: ticket.solicitante?.telefono ?? null },
    tecnico: persona(ticket.tecnico),
  }
}

function leerEspera(ticket, estados, ahora = Date.now()) {
  if (ticket.estado !== 'en_espera') return null
  const espera = estados.findLast((evento) => evento.estado === 'en_espera')
  if (!espera) return null
  const { motivo, retornoEstimado, creadoEn } = espera
  return { motivo, retornoEstimado, desde: creadoEn, retornoVencido: new Date(retornoEstimado).getTime() < ahora }
}

// el tiempo propio del ticket manda (cambio de prioridad en HU-4); si no, el de la subcategoría o la categoría
function tiempoEsperadoDe(ticket) {
  if (Number.isFinite(ticket.tiempoEsperadoHoras)) return ticket.tiempoEsperadoHoras
  return (ticket.subcategoria ?? ticket.categoria)?.tiempoEsperadoHoras ?? null
}

// el plazo se compara con el tiempo de atención, sin contar las esperas
function leerTiempos(ticket, estados) {
  const tiempos = tiemposDe(estados)
  const esperadoHoras = tiempoEsperadoDe(ticket)
  return { ...tiempos, esperadoHoras, dentroDelPlazo: tiempos.atencionMs <= esperadoHoras * HORA_MS }
}

function leerDesenlace(ticket, estados) {
  if (ticket.estado !== 'cerrado') return null
  const cierre = estados.findLast((evento) => evento.estado === 'cerrado')
  // si lo cerró otra historia no hay solución que mostrar
  if (!cierre) return null
  return { solucion: cierre.solucion, cerradoEn: cierre.creadoEn, cerradoPor: persona(cierre.autor) }
}

// las asignaciones y los cambios de prioridad no tienen duración, solo los cambios de estado
function armarEventos(eventos, estados) {
  const etapas = etapasDe(estados)
  const etapaDe = new Map(estados.map((evento, indice) => [evento.id, etapas[indice]]))
  return eventos.map((evento) => ({
    id: evento.id,
    tipo: evento.tipo,
    estado: evento.estado,
    creadoEn: evento.creadoEn,
    autor: persona(evento.autor),
    asignadoA: persona(evento.asignado),
    motivo: evento.motivo,
    prioridadAnterior: evento.prioridadAnterior ?? null,
    prioridadNueva: evento.prioridadNueva ?? null,
    retornoEstimado: evento.retornoEstimado,
    solucion: evento.solucion,
    duracionMs: etapaDe.get(evento.id)?.ms ?? null,
    enCurso: etapaDe.get(evento.id)?.enCurso ?? false,
  }))
}

// el ticket con todo lo que muestran la atención (p25) y el historial (p27)
async function leerTicket(codigo, usuario) {
  const ticket = await atencionRepository.buscarConDetalle(normalizarCodigo(codigo))
  if (!ticket) throw ticketNoEncontrado()
  const permisos = permisosSobre(ticket, usuario)
  const [ambiente, eventos] = await Promise.all([
    atencionRepository.resumenDelAmbiente(ticket.ambienteId),
    atencionRepository.eventosDe(ticket.id),
  ])
  const estados = eventos.filter((evento) => evento.tipo === 'estado')
  return { ticket, permisos, resumen: resumirTicket(ticket, ambiente), eventos, estados }
}

// Atención de un ticket (p25). Quien lo reportó solo ve los comentarios públicos.
export async function obtenerAtencion(codigo, usuario) {
  const { ticket, permisos, resumen, eventos, estados } = await leerTicket(codigo, usuario)
  const bitacora = await atencionRepository.bitacoraDe(ticket.id)
  return {
    ticket: resumen,
    espera: leerEspera(ticket, estados),
    tiempos: leerTiempos(ticket, estados),
    desenlace: leerDesenlace(ticket, estados),
    bitacora: bitacora
      .filter((entrada) => permisos.verInternas || entrada.tipo === 'publico')
      .map(({ id, tipo, mensaje, creadoEn, autor }) => ({ id, tipo, mensaje, creadoEn, autor: persona(autor) })),
    eventos: armarEventos(eventos, estados),
    permisos,
  }
}

// lee el ticket para cambiarlo dentro de una transacción, sin que otro lo cambie a la vez
async function buscarParaCambiar(codigo, t) {
  const ticket = await atencionRepository.buscarTicket(normalizarCodigo(codigo), t, { bloquear: true })
  if (!ticket) throw ticketNoEncontrado()
  return ticket
}

// Bitácora (p25). Las notas internas solo las escriben el técnico asignado y el supervisor.
export async function agregarEntrada(codigo, datos, usuario) {
  await enTransaccion(async (t) => {
    const ticket = await buscarParaCambiar(codigo, t)
    const permisos = permisosSobre(ticket, usuario)
    if (ticket.estado === 'cerrado') {
      throw new ServiceError(409, 'TICKET_CLOSED', 'El ticket está cerrado: su bitácora ya no admite entradas.')
    }
    if (ticket.estado === 'cancelado') {
      throw new ServiceError(409, 'TICKET_CLOSED', 'El ticket está cancelado: su bitácora ya no admite entradas.')
    }
    const esInterna = datos?.tipo === 'interno'
    if (!(esInterna ? permisos.notaInterna : permisos.comentar)) {
      throw new ServiceError(
        403,
        'FORBIDDEN',
        esInterna
          ? 'Solo el técnico asignado y el supervisor registran notas internas.'
          : 'Solo quien reportó el ticket, el técnico asignado y el supervisor comentan en su bitácora.',
      )
    }
    const errores = validateEntrada(datos ?? {})
    if (hasErrors(errores)) throw validationError(errores)

    await atencionRepository.insertarEntrada(
      { ticketId: ticket.id, autorId: usuario.id, tipo: datos.tipo, mensaje: normalizeTexto(datos.mensaje), creadoEn: new Date() },
      t,
    )
  })
  return obtenerAtencion(codigo, usuario)
}

function transicionInvalida(ticket, mensaje) {
  return new ServiceError(409, 'INVALID_TRANSITION', mensaje, null, {
    details: { estado: ticket.estado, permitidas: [...transicionesDesde(ticket.estado)] },
  })
}

// historial y ticket quedan con la misma fecha; el historial lo guarda el repositorio de HU-4
async function registrarEstado(ticket, estado, usuario, { motivo = null, retornoEstimado = null, solucion = null }, t) {
  const ahora = new Date()
  await historialRepository.insertar(
    {
      ticketId: ticket.id,
      tipo: 'estado',
      estado,
      asignadoA: null,
      autorId: usuario.id,
      motivo,
      retornoEstimado,
      solucion,
      prioridadAnterior: null,
      prioridadNueva: null,
      creadoEn: ahora,
    },
    t,
  )
  await atencionRepository.guardarEstado(ticket.id, { estado, cerradoEn: estado === 'cerrado' ? ahora : null }, t)
}

function exigirSuTecnico(ticket, usuario, mensaje) {
  permisosSobre(ticket, usuario)
  if (!esSuTecnico(ticket, usuario)) throw new ServiceError(403, 'FORBIDDEN', mensaje)
}

// Cambiar estado (p26). Solo el técnico asignado; la espera pide motivo y fecha de retorno.
export async function cambiarEstado(codigo, datos, usuario) {
  await enTransaccion(async (t) => {
    const ticket = await buscarParaCambiar(codigo, t)
    exigirSuTecnico(ticket, usuario, 'Solo el técnico que tiene asignado el ticket cambia su estado.')
    const errorDeEstado = validateNuevoEstado(datos?.estado)
    if (errorDeEstado) throw validationError({ estado: errorDeEstado })
    // va antes que el detalle: no tiene sentido pedir motivo si la espera no se permite
    if (!esTransicionValida(ticket.estado, datos.estado)) {
      const actual = formatEstado(ticket.estado).toLowerCase()
      throw transicionInvalida(ticket, `El ticket está ${actual} y no admite el cambio a «${formatEstado(datos.estado)}».`)
    }
    const errores = validateCambioEstado(datos)
    if (hasErrors(errores)) throw validationError(errores)

    const detalle =
      datos.estado === 'en_espera'
        ? { motivo: normalizeTexto(datos.motivo), retornoEstimado: finDelDiaEnLima(datos.retornoEstimado) }
        : {}
    await registrarEstado(ticket, datos.estado, usuario, detalle, t)
  })
  return obtenerAtencion(codigo, usuario)
}

// Cerrar con la solución (p26). Desde ahí quien lo reportó ya puede responder la encuesta (HU-6).
export async function cerrarTicket(codigo, datos, usuario) {
  await enTransaccion(async (t) => {
    const ticket = await buscarParaCambiar(codigo, t)
    exigirSuTecnico(ticket, usuario, 'Solo el técnico que tiene asignado el ticket lo cierra.')
    if (!sePuedeCerrar(ticket.estado)) {
      const actual = formatEstado(ticket.estado).toLowerCase()
      throw transicionInvalida(ticket, `El ticket está ${actual}: solo se cierra un ticket en atención o resuelto.`)
    }
    const errores = validateCierre(datos ?? {})
    if (hasErrors(errores)) throw validationError(errores)

    await registrarEstado(ticket, 'cerrado', usuario, { solucion: normalizeTexto(datos.solucion) }, t)
  })
  return obtenerAtencion(codigo, usuario)
}

// Historial completo del ticket (p27), con el tiempo que pasó en cada estado.
export async function obtenerHistorial(codigo, usuario) {
  const { ticket, resumen, eventos, estados } = await leerTicket(codigo, usuario)
  return {
    ticket: resumen,
    eventos: armarEventos(eventos, estados),
    etapas: tiempoPorEstado(estados),
    tiempos: leerTiempos(ticket, estados),
  }
}

const iso = (fecha) => new Date(fecha).toISOString()

// Tickets que tiene o tuvo el técnico (p24), primero los de actividad más reciente.
export async function listarAtendidos(usuario) {
  if (usuario.rol !== 'tecnico') {
    throw new ServiceError(403, 'FORBIDDEN', 'Solo los técnicos tienen un historial de atención.')
  }
  const tickets = await atencionRepository.atendidosPor(usuario.id)
  const ids = tickets.map(({ id }) => id)
  const [estados, actividad] = await Promise.all([
    historialRepository.listarDe(ids, { tipo: 'estado' }),
    atencionRepository.fechasDeActividad(ids),
  ])
  return tickets
    .map((ticket) => {
      const fechas = actividad.filter(({ ticketId }) => ticketId === ticket.id).map(({ creadoEn }) => iso(creadoEn))
      return {
        id: ticket.id,
        codigo: ticket.codigo,
        asunto: ticket.asunto,
        estado: ticket.estado,
        prioridad: ticket.prioridad,
        creadoEn: ticket.creadoEn,
        cerradoEn: ticket.cerradoEn,
        actualizadoEn: fechas.sort().at(-1) ?? iso(ticket.creadoEn),
        dentroDelPlazo: leerTiempos(ticket, estados.filter(({ ticketId }) => ticketId === ticket.id)).dentroDelPlazo,
        categoria: referencia(ticket.categoria),
        ambiente: { id: ticket.ambiente?.id ?? ticket.ambienteId ?? null, codigo: ticket.ambiente?.codigo ?? 'Sin ambiente' },
        solicitante: persona(ticket.solicitante),
      }
    })
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn) || b.codigo.localeCompare(a.codigo))
}
