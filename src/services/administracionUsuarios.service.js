import { Op } from 'sequelize'
import { db } from '../repositories/RepositoryBase.js'
import { ServiceError } from '../utils/ServiceError.js'
import { usuarioPublico } from './usuarios.service.js'

function formatearUsuarioAdmin(usuario) {
  return {
    ...usuarioPublico(usuario),
    motivoBloqueo: usuario.motivoBloqueo ?? null,
    bloqueadoHasta: usuario.bloqueadoHasta ?? null,
  }
}

export async function listarUsuarios({ rol, estado, busqueda } = {}) {
  const where = {}
  if (rol) where.rol = rol
  if (estado) where.estado = estado
  if (busqueda?.trim()) {
    const q = `%${busqueda.trim()}%`
    where[Op.or] = [
      { nombres: { [Op.like]: q } },
      { apellidos: { [Op.like]: q } },
      { correo: { [Op.like]: q } },
    ]
  }

  const usuarios = await db.usuario.findAll({
    where,
    order: [['creadoEn', 'DESC']],
  })

  return usuarios.map(formatearUsuarioAdmin)
}

export async function obtenerDetalleUsuario(id) {
  const usuario = await db.usuario.findByPk(id, {
    include: [
      { model: db.ticket, as: 'ticketsReportados', attributes: ['id', 'codigo', 'asunto', 'estado', 'creadoEn'] },
      { model: db.ticket, as: 'ticketsAsignados', attributes: ['id', 'codigo', 'asunto', 'estado', 'creadoEn'] },
    ],
  })

  if (!usuario) {
    throw new ServiceError(404, 'USER_NOT_FOUND', 'No encontramos la cuenta solicitada.')
  }

  return {
    ...formatearUsuarioAdmin(usuario),
    ticketsReportados: usuario.ticketsReportados ?? [],
    ticketsAsignados: usuario.ticketsAsignados ?? [],
  }
}

export async function cambiarEstadoUsuario(id, { estado, motivo }, actor) {
  if (!['activo', 'bloqueado'].includes(estado)) {
    throw new ServiceError(400, 'INVALID_STATE', 'El estado debe ser "activo" o "bloqueado".')
  }

  if (actor?.id === id && estado === 'bloqueado') {
    throw new ServiceError(400, 'SELF_BLOCK_FORBIDDEN', 'No puedes bloquear tu propia cuenta de supervisor.')
  }

  const usuario = await db.usuario.findByPk(id)
  if (!usuario) {
    throw new ServiceError(404, 'USER_NOT_FOUND', 'No encontramos la cuenta solicitada.')
  }

  const motivoLimpio = estado === 'bloqueado' ? (motivo?.trim() || 'Bloqueado por supervisión.') : null

  await usuario.update({
    estado,
    motivoBloqueo: motivoLimpio,
    bloqueadoHasta: null,
    intentosFallidos: estado === 'activo' ? 0 : usuario.intentosFallidos,
    versionSesion: estado === 'bloqueado' ? usuario.versionSesion + 1 : usuario.versionSesion,
    actualizadoEn: new Date(),
  })

  return formatearUsuarioAdmin(usuario)
}