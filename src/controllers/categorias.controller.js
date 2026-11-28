import * as categoriasService from '../services/categorias.service.js'

// Los controladores solo leen la petición, llaman al servicio y responden; no tocan la base (§7).

export async function listar(req, res) {
  res.json(await categoriasService.listar())
}

export async function disponibles(req, res) {
  res.json(await categoriasService.listarDisponibles())
}

export async function obtener(req, res) {
  res.json(await categoriasService.obtener(req.params.id))
}

export async function crear(req, res) {
  res.status(201).json(await categoriasService.crear(req.body))
}

export async function actualizar(req, res) {
  res.json(await categoriasService.actualizar(req.params.id, req.body))
}

export async function cambiarEstado(req, res) {
  res.json(await categoriasService.cambiarEstado(req.params.id, req.body))
}

export async function eliminar(req, res) {
  res.json(await categoriasService.eliminar(req.params.id))
}
