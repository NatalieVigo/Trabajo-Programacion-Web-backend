import * as ticketsService from '../services/tickets.service.js'

export async function listarPropios(req, res) {
  res.json(await ticketsService.listarPropios(req.usuario))
}

export async function buscarDuplicado(req, res) {
  res.json(await ticketsService.buscarDuplicado(req.query, req.usuario))
}

export async function crear(req, res) {
  res.status(201).json(await ticketsService.crear(req.body, req.usuario))
}

export async function cancelar(req, res) {
  res.json(await ticketsService.cancelar(req.params.ticketId, req.usuario))
}

export async function reabrir(req, res) {
  res.json(await ticketsService.reabrir(req.params.ticketId, req.body?.motivo, req.usuario))
}
