import * as colaService from '../services/cola.service.js'

// Leen la petición y responden; quién hace la acción sale del token (req.usuario).

export async function listarCola(req, res) {
  res.json(await colaService.listarCola())
}

export async function listarBandeja(req, res) {
  res.json(await colaService.listarBandeja(req.usuario))
}

export async function asignar(req, res) {
  res.json(await colaService.asignarTickets(req.body, req.usuario))
}

export async function cambiarPrioridad(req, res) {
  res.json(await colaService.cambiarPrioridad(req.body, req.usuario))
}

export async function devolver(req, res) {
  res.json(await colaService.devolverTickets(req.body, req.usuario))
}

export async function autoasignar(req, res) {
  res.json(await colaService.autoasignarTicket(req.params.ticketId, req.usuario))
}
