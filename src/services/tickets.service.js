import { enTransaccion } from '../repositories/RepositoryBase.js'
import { categoriasRepository, subcategoriasRepository } from '../repositories/categorias.repository.js'
import { historialRepository } from '../repositories/historial.repository.js'
import { ambientesRepository } from '../repositories/ubicaciones.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'

const ESTADOS_EN_CURSO = ['abierto', 'reabierto', 'en_atencion', 'en_espera', 'resuelto']
const TEXTO_REQUERIDO = 'Completa este campo.'
const AMBIENTE_REQUERIDO = 'Elige el aula o ambiente de la lista.'
export const DIAS_PLAZO_REAPERTURA = 7
const PLAZO_REAPERTURA_MS = DIAS_PLAZO_REAPERTURA * 24 * 60 * 60 * 1000
const ESTADOS_CANCELABLES = ['abierto', 'reabierto']

function exigirUsuarioActivo(usuario) {
  if (!usuario || usuario.estado !== 'activo' || usuario.rol !== 'usuario') {
    throw new ServiceError(403, 'FORBIDDEN', 'Solo una cuenta de usuario activa puede registrar tickets.')
  }
}

function validarNuevoTicket(datos) {
  const valores = {
    categoriaId: String(datos?.categoriaId ?? '').trim(),
    subcategoriaId: String(datos?.subcategoriaId ?? '').trim(),
    ambienteId: String(datos?.ambienteId ?? '').trim(),
    asunto: String(datos?.asunto ?? '').trim(),
    descripcion: String(datos?.descripcion ?? '').trim(),
  }
  const errores = {}

  for (const campo of ['categoriaId', 'subcategoriaId', 'asunto', 'descripcion']) {
    if (!valores[campo]) errores[campo] = TEXTO_REQUERIDO
  }
  if (!valores.ambienteId) errores.ambienteId = AMBIENTE_REQUERIDO
  if (valores.asunto.length > 120) errores.asunto = 'Usa como máximo 120 caracteres.'
  if (valores.descripcion.length > 600) errores.descripcion = 'Usa como máximo 600 caracteres.'

  if (Object.keys(errores).length > 0) throw validationError(errores)
  return valores
}

export async function listarPropios(usuario) {
  exigirUsuarioActivo(usuario)
  return ticketsRepository.listarPorUsuario(usuario.id)
}

export async function buscarDuplicado({ categoriaId, ambienteId }, usuario) {
  exigirUsuarioActivo(usuario)
  const valores = {
    categoriaId: String(categoriaId ?? '').trim(),
    ambienteId: String(ambienteId ?? '').trim(),
  }
  const errores = {}
  if (!valores.categoriaId) errores.categoriaId = TEXTO_REQUERIDO
  if (!valores.ambienteId) errores.ambienteId = AMBIENTE_REQUERIDO
  if (Object.keys(errores).length > 0) throw validationError(errores)

  const repetido = await ticketsRepository.buscarRepetido({
    ...valores,
    estados: ESTADOS_EN_CURSO,
  })
  if (!repetido) return null

  const propio = await ticketsRepository.buscarRepetido(
    { ...valores, estados: ESTADOS_EN_CURSO },
    usuario.id,
  )
  return propio
    ? { propio: true, codigo: propio.codigo, creadoEn: propio.creadoEn }
    : { propio: false }
}

export async function crear(datos, usuario) {
  exigirUsuarioActivo(usuario)
  const valores = validarNuevoTicket(datos)
  const [categoria, subcategoria, ambiente] = await Promise.all([
    categoriasRepository.buscar(valores.categoriaId),
    subcategoriasRepository.buscar(valores.subcategoriaId),
    ambientesRepository.buscar(valores.ambienteId),
  ])

  if (!categoria?.activa) {
    throw validationError({ categoriaId: 'Elige una categoría disponible.' })
  }
  if (!subcategoria?.activa || subcategoria.categoriaId !== categoria.id) {
    throw validationError({ subcategoriaId: 'Elige una subcategoría disponible para esta categoría.' })
  }
  if (!ambiente) throw validationError({ ambienteId: AMBIENTE_REQUERIDO })

  return enTransaccion(async (t) => {
    const id = await ticketsRepository.nuevoId(t)
    const creadoEn = new Date()
    const ticket = {
      id,
      codigo: `TCK-${creadoEn.getFullYear()}-${id.slice('tck-'.length)}`,
      usuarioId: usuario.id,
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
      ambienteId: ambiente.id,
      asunto: valores.asunto,
      descripcion: valores.descripcion,
      prioridad: subcategoria.prioridadPorDefecto ?? categoria.prioridadPorDefecto,
      tiempoEsperadoHoras: subcategoria.tiempoEsperadoHoras ?? categoria.tiempoEsperadoHoras,
      estado: 'abierto',
      creadoEn,
      cerradoEn: null,
      asignadoA: null,
    }
    const creado = await ticketsRepository.insertar(ticket, t)
    await historialRepository.insertar({
      ticketId: id,
      tipo: 'estado',
      estado: 'abierto',
      asignadoA: null,
      autorId: usuario.id,
      motivo: null,
      retornoEstimado: null,
      solucion: null,
      prioridadAnterior: null,
      prioridadNueva: null,
      creadoEn,
    }, t)
    return creado
  })
}

async function exigirTicketPropio(ticketId, usuarioId, t, { bloquear = false } = {}) {
  const ticket = await ticketsRepository.buscarPropio(ticketId, usuarioId, t, { bloquear })
  if (!ticket) {
    throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket de tu cuenta con ese código.')
  }
  return ticket
}

async function registrarCambioEstado(ticketId, estado, autorId, motivo, cerradoEn, t) {
  await ticketsRepository.actualizar(ticketId, { estado, cerradoEn }, t)
  await historialRepository.insertar({
    ticketId,
    tipo: 'estado',
    estado,
    asignadoA: null,
    autorId,
    motivo,
    retornoEstimado: null,
    solucion: null,
    prioridadAnterior: null,
    prioridadNueva: null,
  }, t)
}

export async function cancelar(ticketId, usuario) {
  exigirUsuarioActivo(usuario)
  return enTransaccion(async (t) => {
    const ticket = await exigirTicketPropio(ticketId, usuario.id, t, { bloquear: true })
    if (ticket.asignadoA || !ESTADOS_CANCELABLES.includes(ticket.estado)) {
      throw new ServiceError(
        409,
        'TICKET_NOT_CANCELLABLE',
        'Solo puedes cancelar un ticket que todavía no fue asignado.',
      )
    }

    await registrarCambioEstado(
      ticket.id,
      'cancelado',
      usuario.id,
      'Cancelado por quien reportó el ticket.',
      null,
      t,
    )
    return { ...ticket, estado: 'cancelado', cerradoEn: null }
  })
}

export async function reabrir(ticketId, motivo, usuario) {
  exigirUsuarioActivo(usuario)
  const texto = typeof motivo === 'string' ? motivo.trim() : ''
  if (!texto) throw validationError({ motivo: 'Indica por qué necesitas reabrir el ticket.' })
  if (texto.length > 600) throw validationError({ motivo: 'Usa como máximo 600 caracteres.' })

  return enTransaccion(async (t) => {
    const ticket = await exigirTicketPropio(ticketId, usuario.id, t, { bloquear: true })
    const cerradoEn = Date.parse(ticket.cerradoEn ?? '')
    const dentroDelPlazo =
      ticket.estado === 'cerrado' &&
      Number.isFinite(cerradoEn) &&
      cerradoEn <= Date.now() &&
      Date.now() - cerradoEn <= PLAZO_REAPERTURA_MS

    if (ticket.estado !== 'cerrado') {
      throw new ServiceError(409, 'TICKET_NOT_CLOSED', 'Solo puedes reabrir un ticket que está cerrado.')
    }
    if (!dentroDelPlazo) {
      throw new ServiceError(
        409,
        'REOPEN_PERIOD_EXPIRED',
        `El plazo de reapertura de ${DIAS_PLAZO_REAPERTURA} días ya venció.`,
      )
    }

    await registrarCambioEstado(ticket.id, 'reabierto', usuario.id, texto, null, t)
    return { ...ticket, estado: 'reabierto', cerradoEn: null }
  })
}
