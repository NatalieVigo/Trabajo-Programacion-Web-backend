import { colaRepository } from '../repositories/cola.repository.js'
import { habilitacionesRepository } from '../repositories/habilitaciones.repository.js'
import { bitacoraRepository, historialRepository } from '../repositories/historial.repository.js'
import { enTransaccion } from '../repositories/RepositoryBase.js'
import { usosCatalogoRepository, ESTADOS_EN_CURSO } from '../repositories/usosCatalogo.repository.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'
import { tiemposDe } from '../utils/tiemposDeAtencion.js'

// HU-4 Cola y asignación (mockups p22 a p24). Mismas reglas y mensajes que tenía el frontend en la entrega 1.

const HORA_MS = 60 * 60 * 1000

export const HORAS_POR_PRIORIDAD = Object.freeze({ critica: 2, alta: 8, media: 24, baja: 72 })

// la cola muestra lo que sigue vivo y lo resuelto (aún sin cerrar)
const ESTADOS_COLA = Object.freeze(['abierto', 'reabierto', 'en_atencion', 'en_espera', 'resuelto'])

// como getDisplayName del frontend: primer nombre y apellidos
const nombreCorto = (persona) => (persona ? `${persona.nombres.split(' ')[0]} ${persona.apellidos}`.trim() : null)

const iso = (valor) => (valor ? new Date(valor).toISOString() : null)

// el tiempo propio del ticket manda (cambio de prioridad); si no, el de la subcategoría o la categoría
function horasEsperadas(ticket) {
  if (Number.isFinite(ticket.tiempoEsperadoHoras)) return ticket.tiempoEsperadoHoras
  return ticket.subcategoria?.tiempoEsperadoHoras ?? ticket.categoria?.tiempoEsperadoHoras ?? HORAS_POR_PRIORIDAD[ticket.prioridad]
}

// arma la fila que muestran la cola y la bandeja, con sus tiempos
function detalle(ticket, estados, ahora) {
  const { atencionMs } = tiemposDe(estados, ahora)
  const esperadoHoras = horasEsperadas(ticket)
  const restanteMs = esperadoHoras * HORA_MS - atencionMs
  const espera = ticket.estado === 'en_espera' ? estados.findLast(({ estado }) => estado === 'en_espera') : null
  return {
    id: ticket.id,
    codigo: ticket.codigo,
    asunto: ticket.asunto,
    categoriaId: ticket.categoriaId,
    categoria: ticket.categoria?.nombre ?? 'Sin categoría',
    subcategoria: ticket.subcategoria?.nombre ?? null,
    ambienteId: ticket.ambienteId,
    ambiente: ticket.ambiente?.codigo ?? ticket.ambiente?.nombre ?? 'Sin ambiente',
    solicitante: nombreCorto(ticket.solicitante),
    tecnicoId: ticket.asignadoA,
    tecnico: nombreCorto(ticket.tecnico),
    prioridad: ticket.prioridad,
    estado: ticket.estado,
    creadoEn: iso(ticket.creadoEn),
    cerradoEn: iso(ticket.cerradoEn),
    resueltoEn: iso(estados.findLast(({ estado }) => estado === 'resuelto')?.creadoEn),
    antiguedadMs: Math.max(0, ahora - new Date(ticket.creadoEn).getTime()),
    esperadoHoras,
    restanteMs,
    vencimientoEn: new Date(ahora + restanteMs).toISOString(),
    fueraDePlazo: ESTADOS_EN_CURSO.includes(ticket.estado) && ticket.estado !== 'en_espera' && restanteMs < 0,
    espera: espera ? { motivo: espera.motivo, retornoEstimado: iso(espera.retornoEstimado) } : null,
  }
}

// agrega a cada ticket sus tiempos, leyendo el historial de estados de todos en una sola consulta
async function conDetalle(tickets, ahora) {
  const eventos = await historialRepository.listarDe(tickets.map(({ id }) => id), { tipo: 'estado' })
  return tickets.map((ticket) => detalle(ticket, eventos.filter(({ ticketId }) => ticketId === ticket.id), ahora))
}

async function tecnicosConCarga() {
  const [tecnicos, habilitaciones, tickets] = await Promise.all([
    usosCatalogoRepository.tecnicosActivos(),
    habilitacionesRepository.listar(),
    colaRepository.listarTickets(),
  ])
  return tecnicos.map((tecnico) => {
    const propios = tickets.filter(({ asignadoA }) => asignadoA === tecnico.id)
    return {
      id: tecnico.id,
      nombre: nombreCorto(tecnico),
      habilitadas: habilitaciones.filter(({ tecnicoId }) => tecnicoId === tecnico.id).map(({ categoriaId }) => categoriaId),
      carga: propios.length,
      criticos: propios.filter(({ prioridad }) => prioridad === 'critica').length,
    }
  })
}

// ---------- Consultas ----------

// Cola general del supervisor (p22), con lo necesario para los filtros y el modal de asignación (p23).
export async function listarCola() {
  const ahora = Date.now()
  const [tickets, tecnicos, categorias, ambientes] = await Promise.all([
    colaRepository.listarTickets({ estados: ESTADOS_COLA }),
    tecnicosConCarga(),
    colaRepository.categorias(),
    colaRepository.ambientes(),
  ])
  return { tickets: await conDetalle(tickets, ahora), tecnicos, categorias, ambientes }
}

// Bandeja del técnico (p24): sus tickets y los que puede autoasignarse.
export async function listarBandeja(tecnico) {
  const ahora = Date.now()
  const [propios, sinAsignar, habilitaciones, categorias] = await Promise.all([
    colaRepository.listarTickets({ asignadoA: tecnico.id }),
    colaRepository.listarTickets({ estados: ESTADOS_EN_CURSO, sinAsignar: true }),
    habilitacionesRepository.listar({ tecnicoId: tecnico.id }),
    colaRepository.categorias(),
  ])
  const habilitadas = new Set(habilitaciones.map(({ categoriaId }) => categoriaId))
  const nombresCategoria = new Map(categorias.map(({ id, nombre }) => [id, nombre]))
  return {
    tecnico: {
      nombre: nombreCorto(tecnico),
      especialidades: (tecnico.especialidades ?? []).map((id) => nombresCategoria.get(id)).filter(Boolean),
    },
    tickets: await conDetalle(propios, ahora),
    disponibles: await conDetalle(
      sinAsignar.filter(({ categoriaId }) => habilitadas.has(categoriaId)),
      ahora,
    ),
  }
}

// ---------- Validaciones comunes ----------

function idsValidos(ids) {
  const sonTexto = Array.isArray(ids) && ids.every((id) => typeof id === 'string' && id)
  if (!sonTexto || ids.length === 0 || new Set(ids).size !== ids.length) {
    throw validationError({ tickets: 'Selecciona al menos un ticket, sin repetirlo.' })
  }
  return ids
}

// lee y bloquea los tickets; todos deben existir y seguir en la cola
async function ticketsDe(t, ids) {
  const encontrados = await colaRepository.bloquearTickets(idsValidos(ids), t)
  return ids.map((id) => {
    const ticket = encontrados.find((fila) => fila.id === id)
    if (!ticket) throw new ServiceError(404, 'TICKET_NOT_FOUND', 'Uno de los tickets ya no existe.')
    if (!ESTADOS_COLA.includes(ticket.estado)) {
      throw new ServiceError(409, 'TICKET_NOT_IN_QUEUE', 'Un ticket seleccionado ya no está en la cola.')
    }
    return ticket
  })
}

// ---------- Operaciones (todo o nada: cada una va en una transacción) ----------

// Asignar o reasignar uno o varios tickets (p23 y barra de lote p22). Con técnico previo, la nota es el motivo.
export async function asignarTickets({ ids, tecnicoId, nota = '' } = {}, supervisor) {
  if (typeof nota !== 'string' || nota.trim().length > 240) {
    throw validationError({ nota: 'La nota debe tener como máximo 240 caracteres.' })
  }
  const texto = nota.trim()
  return enTransaccion(async (t) => {
    const seleccion = await ticketsDe(t, ids)
    const tecnico = (await usosCatalogoRepository.tecnicosActivos(t)).find(({ id }) => id === tecnicoId)
    if (!tecnico) throw validationError({ tecnico: 'Elige un técnico activo.' })

    const habilitadas = new Set((await habilitacionesRepository.listar({ tecnicoId }, t)).map(({ categoriaId }) => categoriaId))
    if (seleccion.some(({ categoriaId }) => !habilitadas.has(categoriaId))) {
      throw validationError({ tecnico: 'El técnico no está habilitado para todas las categorías seleccionadas.' })
    }
    if (seleccion.some(({ asignadoA }) => asignadoA === tecnicoId)) {
      throw new ServiceError(409, 'ALREADY_ASSIGNED', 'Uno de los tickets ya está asignado a este técnico.')
    }
    if (seleccion.some(({ asignadoA }) => asignadoA) && texto.length < 10) {
      throw validationError({ nota: 'Explica la reasignación con al menos 10 caracteres.' })
    }

    for (const ticket of seleccion) {
      const esReasignacion = Boolean(ticket.asignadoA)
      await colaRepository.asignar(ticket.id, tecnicoId, t)
      await historialRepository.insertar(
        { ticketId: ticket.id, tipo: 'asignacion', asignadoA: tecnicoId, autorId: supervisor.id, motivo: esReasignacion ? texto : null },
        t,
      )
      if (texto) await bitacoraRepository.insertarNotaInterna({ ticketId: ticket.id, autorId: supervisor.id, mensaje: texto }, t)
    }
    return { actualizados: seleccion.length }
  })
}

// Cambiar la prioridad con motivo (p23); también en lote.
export async function cambiarPrioridad({ ids, prioridad, motivo } = {}, supervisor) {
  if (!Object.hasOwn(HORAS_POR_PRIORIDAD, prioridad ?? '')) {
    throw validationError({ prioridad: 'Elige una prioridad válida.' })
  }
  if (typeof motivo !== 'string' || motivo.trim().length < 10 || motivo.trim().length > 240) {
    throw validationError({ motivo: 'Explica el motivo con entre 10 y 240 caracteres.' })
  }
  return enTransaccion(async (t) => {
    const seleccion = await ticketsDe(t, ids)
    if (seleccion.every(({ prioridad: actual }) => actual === prioridad)) {
      throw validationError({ prioridad: 'La nueva prioridad debe ser diferente de la actual.' })
    }
    let actualizados = 0
    for (const ticket of seleccion) {
      if (ticket.prioridad === prioridad) continue
      actualizados += 1
      await colaRepository.cambiarPrioridad(ticket.id, prioridad, HORAS_POR_PRIORIDAD[prioridad], t)
      await historialRepository.insertar(
        {
          ticketId: ticket.id,
          tipo: 'prioridad',
          autorId: supervisor.id,
          prioridadAnterior: ticket.prioridad,
          prioridadNueva: prioridad,
          motivo: motivo.trim(),
        },
        t,
      )
    }
    return { actualizados }
  })
}

// Devolver a la cola (confirmación destructiva de p23): queda sin técnico y abierto.
export async function devolverTickets({ ids } = {}, supervisor) {
  return enTransaccion(async (t) => {
    const seleccion = await ticketsDe(t, ids)
    if (seleccion.some(({ asignadoA }) => !asignadoA)) {
      throw new ServiceError(409, 'TICKET_UNASSIGNED', 'Selecciona solo tickets que tengan un técnico asignado.')
    }
    for (const ticket of seleccion) {
      await colaRepository.devolver(ticket.id, t)
      await historialRepository.insertar({ ticketId: ticket.id, tipo: 'asignacion', asignadoA: null, autorId: supervisor.id }, t)
      await historialRepository.insertar({ ticketId: ticket.id, tipo: 'estado', estado: 'abierto', autorId: supervisor.id }, t)
    }
    return { actualizados: seleccion.length }
  })
}

// El técnico toma un ticket sin asignar de una categoría en la que está habilitado.
export async function autoasignarTicket(ticketId, tecnico) {
  return enTransaccion(async (t) => {
    const [ticket] = await ticketsDe(t, [ticketId])
    if (ticket.asignadoA) throw new ServiceError(409, 'ALREADY_ASSIGNED', 'El ticket ya tiene un técnico asignado.')
    if (!ESTADOS_EN_CURSO.includes(ticket.estado)) {
      throw new ServiceError(409, 'TICKET_NOT_AVAILABLE', 'El ticket ya no está disponible.')
    }
    const habilitaciones = await habilitacionesRepository.listar({ tecnicoId: tecnico.id }, t)
    if (!habilitaciones.some(({ categoriaId }) => categoriaId === ticket.categoriaId)) {
      throw new ServiceError(403, 'CATEGORY_NOT_ALLOWED', 'No estás habilitado para esta categoría.')
    }
    await colaRepository.asignar(ticket.id, tecnico.id, t)
    await historialRepository.insertar(
      { ticketId: ticket.id, tipo: 'asignacion', asignadoA: tecnico.id, autorId: tecnico.id, motivo: 'Autoasignación del técnico.' },
      t,
    )
    return { id: ticket.id }
  })
}
