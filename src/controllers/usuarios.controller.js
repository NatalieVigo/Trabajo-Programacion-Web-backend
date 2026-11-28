import * as administracionUsuariosService from '../services/administracionUsuarios.service.js'

// HU-7: solo el supervisor llega a estas rutas; req.usuario es su cuenta (ver autenticar)
export async function listarCuentas(req, res) {
  res.json(await administracionUsuariosService.listarCuentas())
}

export async function obtenerFicha(req, res) {
  res.json(await administracionUsuariosService.obtenerFichaCuenta(req.params.id))
}

export async function bloquear(req, res) {
  res.json(await administracionUsuariosService.bloquearCuenta(req.params.id, req.body ?? {}, req.usuario))
}

export async function desbloquear(req, res) {
  res.json(await administracionUsuariosService.desbloquearCuenta(req.params.id))
}
