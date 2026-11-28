import { resumenRepository } from '../repositories/resumen.repository.js'
import { hoyEnLima } from '../utils/fechaLima.js'
import { instantesDelPeriodo } from '../utils/periodo.js'

// la encuesta se puede responder hasta 7 días después del cierre
const PLAZO_ENCUESTA_MS = 7 * 24 * 60 * 60 * 1000

// encuestas aún a tiempo, la más urgente primero
async function encuestasPendientes(usuarioId) {
  const cerrados = await resumenRepository.cerradosSinEncuesta(usuarioId, new Date(Date.now() - PLAZO_ENCUESTA_MS))
  return cerrados.map(({ codigo, cerradoEn }) => ({
    ticketCodigo: codigo,
    cerradoEn,
    fechaLimite: new Date(cerradoEn.getTime() + PLAZO_ENCUESTA_MS),
  }))
}

// La bienvenida (p05) y los contadores de la cabecera y del menú de cada rol.
const CONTADORES_POR_ROL = {
  async usuario(usuarioId) {
    const [tickets, pendientes, respondidas] = await Promise.all([
      resumenRepository.contarTicketsDelUsuario(usuarioId),
      encuestasPendientes(usuarioId),
      resumenRepository.contarEncuestasRespondidas(usuarioId),
    ])
    return {
      ticketsAbiertos: tickets.abiertos,
      ticketsReportados: tickets.reportados,
      encuestasPendientes: pendientes.length,
      encuestasRespondidas: respondidas,
    }
  },
  async tecnico(usuarioId) {
    const asignados = await resumenRepository.ticketsAsignados(usuarioId)
    const conEstado = (estado) => asignados.filter((ticket) => ticket.estado === estado)
    // los que siguen resueltos y pasaron a resuelto hoy (en Lima)
    const hoy = hoyEnLima()
    const { inicio, fin } = instantesDelPeriodo({ desde: hoy, hasta: hoy })
    const resueltos = conEstado('resuelto').map(({ id }) => id)
    return {
      asignados: asignados.length,
      enAtencion: conEstado('en_atencion').length,
      enEspera: conEstado('en_espera').length,
      resueltosHoy: await resumenRepository.contarResueltosEntre(resueltos, inicio, fin),
    }
  },
  async supervisor() {
    const [colaSinAsignar, colaTotal, usuariosTotal] = await Promise.all([
      resumenRepository.contarColaSinAsignar(),
      resumenRepository.contarNoCerrados(),
      resumenRepository.contarUsuarios(),
    ])
    return { colaSinAsignar, colaTotal, usuariosTotal }
  },
}

export function obtenerContadores(usuario) {
  return CONTADORES_POR_ROL[usuario.rol](usuario.id)
}

// Tarjeta lateral de Mi cuenta (p10); técnico y supervisor solo muestran la fecha de creación.
export async function obtenerResumenCuenta(usuario) {
  if (usuario.rol !== 'usuario') return { cuentaCreada: usuario.creadoEn }
  const [tickets, pendientes] = await Promise.all([
    resumenRepository.contarTicketsDelUsuario(usuario.id),
    encuestasPendientes(usuario.id),
  ])
  return {
    ticketsReportados: tickets.reportados,
    abiertosAhora: tickets.abiertos,
    encuestaPendiente: pendientes[0] ?? null,
    cuentaCreada: usuario.creadoEn,
  }
}
