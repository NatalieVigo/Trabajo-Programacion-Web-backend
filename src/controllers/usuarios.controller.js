import * as administracionUsuariosService from '../services/administracionUsuarios.service.js'

export async function listarUsuarios(req, res) {
  const usuarios = await administracionUsuariosService.listarUsuarios(req.query)
  res.json(usuarios)
}

export async function obtenerUsuario(req, res) {
  const usuario = await administracionUsuariosService.obtenerDetalleUsuario(req.params.id)
  res.json(usuario)
}

export async function cambiarEstado(req, res) {
  const usuario = await administracionUsuariosService.cambiarEstadoUsuario(
    req.params.id,
    req.body ?? {},
    req.usuario,
  )
  res.json(usuario)
}