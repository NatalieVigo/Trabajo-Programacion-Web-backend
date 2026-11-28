import * as ubicacionesService from '../services/ubicaciones.service.js'

// Sedes, pabellones y ambientes; solo leen la petición, llaman al servicio y responden.

export async function listarSedes(req, res) {
  res.json(await ubicacionesService.listarSedes())
}

export async function crearSede(req, res) {
  res.status(201).json(await ubicacionesService.crearSede(req.body))
}

export async function actualizarSede(req, res) {
  res.json(await ubicacionesService.actualizarSede(req.params.id, req.body))
}

export async function eliminarSede(req, res) {
  res.json(await ubicacionesService.eliminarSede(req.params.id))
}

export async function crearPabellon(req, res) {
  res.status(201).json(await ubicacionesService.crearPabellon(req.body))
}

export async function actualizarPabellon(req, res) {
  res.json(await ubicacionesService.actualizarPabellon(req.params.id, req.body))
}

export async function eliminarPabellon(req, res) {
  res.json(await ubicacionesService.eliminarPabellon(req.params.id))
}

export async function listarAmbientes(req, res) {
  res.json(await ubicacionesService.listarAmbientes())
}

export async function crearAmbiente(req, res) {
  res.status(201).json(await ubicacionesService.crearAmbiente(req.body))
}

export async function actualizarAmbiente(req, res) {
  res.json(await ubicacionesService.actualizarAmbiente(req.params.id, req.body))
}

export async function eliminarAmbiente(req, res) {
  res.json(await ubicacionesService.eliminarAmbiente(req.params.id))
}
