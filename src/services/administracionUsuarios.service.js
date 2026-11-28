import { administracionUsuariosRepository as cuentasRepository } from '../repositories/administracionUsuarios.repository.js'
import { metricasRepository } from '../repositories/metricas.repository.js'
import { enTransaccion } from '../repositories/RepositoryBase.js'
import { usuariosRepository } from '../repositories/usuarios.repository.js'
import { ESTADOS_EN_CURSO } from '../utils/estadosTicket.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'

// HU-7 Gestión de usuarios (p32 y p33): listado, ficha, bloqueo y desbloqueo. Solo el supervisor llega aquí (ver la
// ruta); autenticar ya rechaza las cuentas bloqueadas, así que es un supervisor activo.
const MOTIVO_MAXIMO = 240

const enCurso = (ticket) => ESTADOS_EN_CURSO.includes(ticket.estado)
const esCriticoEnCurso = (ticket) => ticket.prioridad === 'critica' && enCurso(ticket)
// como getDisplayName del frontend: primer nombre y apellidos
const nombreCorto = ({ nombres, apellidos }) => `${nombres.split(' ')[0]} ${apellidos}`.trim()
const pluralizar = (cantidad, singular, plural) => `${cantidad} ${cantidad === 1 ? singular : plural}`

const cuentaNoEncontrada = () => new ServiceError(404, 'USER_NOT_FOUND', 'No encontramos la cuenta solicitada.')

function cuentaPublica(cuenta, tickets, categorias) {
  return {
    id: cuenta.id,
    nombres: cuenta.nombres,
    apellidos: cuenta.apellidos,
    nombre: nombreCorto(cuenta),
    correo: cuenta.correo,
    telefono: cuenta.telefono,
    rol: cuenta.rol,
    unidad: cuenta.unidad,
    vinculo: cuenta.vinculo,
    estado: cuenta.estado,
    creadoEn: cuenta.creadoEn,
    ambienteHabitualId: cuenta.ambienteHabitualId,
    ultimoAccesoEn: cuenta.ultimoAccesoEn ?? null,
    motivoBloqueo: cuenta.motivoBloqueo ?? null,
    especialidad: cuenta.especialidades
      .map((id) => categorias.find((cat) => cat.id === id)?.nombre)
      .filter(Boolean)
      .join(' · '),
    ticketsReportados: tickets.filter((t) => t.usuarioId === cuenta.id).length,
    criticosAsignados: tickets.filter((t) => t.asignadoA === cuenta.id && esCriticoEnCurso(t)).length,
  }
}

// todas las cuentas; los filtros, la búsqueda y la paginación los hace la vista
export async function listarCuentas() {
  const [cuentas, tickets, categorias] = await Promise.all([
    cuentasRepository.listarCuentas(),
    cuentasRepository.listarTickets(),
    cuentasRepository.listarCategorias(),
  ])
  return cuentas.map((cuenta) => cuentaPublica(cuenta, tickets, categorias))
}

// la cuenta con su historial de reportes, del más reciente al más antiguo
export async function obtenerFichaCuenta(id) {
  const cuenta = await cuentasRepository.buscarCuenta(id)
  if (!cuenta) throw cuentaNoEncontrada()
  const [tickets, categorias, encuestas] = await Promise.all([
    cuentasRepository.listarTickets(),
    cuentasRepository.listarCategorias(),
    metricasRepository.encuestasRespondidas({ usuarioId: id }),
  ])
  const reportados = tickets.filter((t) => t.usuarioId === id)
  const unicos = (campo) => [...new Set(reportados.map((t) => t[campo]).filter(Boolean))]
  const [subcategorias, ambientes] = await Promise.all([
    cuentasRepository.listarSubcategorias(unicos('subcategoriaId')),
    cuentasRepository.listarAmbientes([...unicos('ambienteId'), cuenta.ambienteHabitualId].filter(Boolean)),
  ])
  const nombreDe = (lista, id) => lista.find((item) => item.id === id)
  const reportes = reportados
    .map((t) => {
      const ambiente = nombreDe(ambientes, t.ambienteId)
      const encuesta = t.estado === 'cerrado' ? encuestas.find((e) => e.ticketId === t.id) : null
      const puntaje = Number(encuesta?.puntaje)
      return {
        id: t.id,
        codigo: t.codigo,
        asunto: t.asunto,
        categoria:
          [nombreDe(categorias, t.categoriaId)?.nombre, nombreDe(subcategorias, t.subcategoriaId)?.nombre]
            .filter(Boolean)
            .join(' · ') || 'Sin categoría',
        ambiente: ambiente?.codigo ?? ambiente?.nombre ?? 'Sin ambiente',
        prioridad: t.prioridad,
        estado: t.estado,
        encuesta: puntaje >= 1 && puntaje <= 5 ? puntaje : null,
        creadoEn: t.creadoEn,
      }
    })
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn))
  const puntajes = reportes.filter((r) => r.encuesta !== null).map((r) => r.encuesta)
  const habitual = nombreDe(ambientes, cuenta.ambienteHabitualId)
  return {
    cuenta: cuentaPublica(cuenta, tickets, categorias),
    ambienteHabitual: habitual?.codigo ?? habitual?.nombre ?? 'Sin registrar',
    reportes,
    resumen: {
      reportados: reportados.length,
      abiertos: reportados.filter(enCurso).length,
      cerrados: reportados.filter((t) => t.estado === 'cerrado').length,
      satisfaccion: puntajes.length ? puntajes.reduce((a, b) => a + b, 0) / puntajes.length : null,
    },
  }
}

// Bloquea la cuenta con su motivo y cierra sus sesiones. No se bloquea a uno mismo ni a quien tiene tickets críticos
// en curso, que primero hay que reasignar.
export async function bloquearCuenta(id, { motivo } = {}, supervisor) {
  if (typeof motivo !== 'string' || !motivo.trim() || motivo.trim().length > MOTIVO_MAXIMO) {
    throw validationError({ motivo: `Escribe el motivo del bloqueo, con un máximo de ${MOTIVO_MAXIMO} caracteres.` })
  }
  return enTransaccion(async (t) => {
    const cuenta = await cuentasRepository.buscarCuenta(id, t)
    if (!cuenta) throw cuentaNoEncontrada()
    if (id === supervisor.id) {
      throw new ServiceError(409, 'SELF_BLOCK', 'No puedes bloquear la cuenta con la que estás trabajando.')
    }
    if (cuenta.estado !== 'activo') {
      throw new ServiceError(409, 'ACCOUNT_CHANGED', 'La cuenta ya no está activa. Actualiza la lista.')
    }
    const criticos = (await cuentasRepository.listarTickets({ asignadoA: id }, t)).filter(esCriticoEnCurso)
    if (criticos.length) {
      const reasignar = criticos.length === 1 ? 'Reasígnalo' : 'Reasígnalos'
      const cuantos = pluralizar(criticos.length, 'ticket crítico abierto', 'tickets críticos abiertos')
      throw new ServiceError(409, 'CRITICAL_TICKETS', `Esta cuenta tiene ${cuantos}. ${reasignar} antes de bloquearla.`)
    }
    await cuentasRepository.bloquear(id, motivo.trim(), new Date(), t)
    await usuariosRepository.cerrarSesiones(id, t)
    return { id, nombre: nombreCorto(cuenta) }
  })
}

export async function desbloquearCuenta(id) {
  return enTransaccion(async (t) => {
    const cuenta = await cuentasRepository.buscarCuenta(id, t)
    if (!cuenta) throw cuentaNoEncontrada()
    if (cuenta.estado !== 'bloqueado') {
      throw new ServiceError(409, 'ACCOUNT_CHANGED', 'La cuenta ya no está bloqueada. Actualiza la ficha.')
    }
    await cuentasRepository.desbloquear(id, new Date(), t)
    return { id, nombre: nombreCorto(cuenta) }
  })
}
