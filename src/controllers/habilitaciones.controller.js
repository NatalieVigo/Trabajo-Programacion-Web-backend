import * as habilitacionesService from '../services/habilitaciones.service.js'

export async function obtener(req, res) {
  res.json(await habilitacionesService.obtenerMatriz())
}

export async function guardar(req, res) {
  res.json(await habilitacionesService.guardarMatriz(req.body))
}
