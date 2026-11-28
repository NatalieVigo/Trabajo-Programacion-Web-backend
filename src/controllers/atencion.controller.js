import * as atencionService from '../services/atencion.service.js'

// HU-5: los controladores solo leen la petición, llaman al servicio y responden; no tocan la base (§7).

export async function listarAtendidos(req, res) {
  res.json(await atencionService.listarAtendidos(req.usuario))
}

export async function obtener(req, res) {
  res.json(await atencionService.obtenerAtencion(req.params.codigo, req.usuario))
}

export async function historial(req, res) {
  res.json(await atencionService.obtenerHistorial(req.params.codigo, req.usuario))
}

export async function agregarEntrada(req, res) {
  res.status(201).json(await atencionService.agregarEntrada(req.params.codigo, req.body, req.usuario))
}

export async function cambiarEstado(req, res) {
  res.json(await atencionService.cambiarEstado(req.params.codigo, req.body, req.usuario))
}

export async function cerrar(req, res) {
  res.json(await atencionService.cerrarTicket(req.params.codigo, req.body, req.usuario))
}
