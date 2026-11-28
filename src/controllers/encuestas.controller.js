import * as encuestasService from '../services/encuestas.service.js'

// HU-6: req.usuario es la cuenta de la sesión (ver autenticar)
export async function listarMias(req, res) {
  res.json(await encuestasService.listarMisEncuestas(req.usuario))
}

export async function obtenerSatisfaccion(req, res) {
  const { desde, hasta, puntaje } = req.query
  res.json(await encuestasService.reporteSatisfaccion({ desde, hasta, puntaje }))
}

export async function obtener(req, res) {
  res.json(await encuestasService.obtenerEncuesta(req.params.codigo, req.usuario))
}

// 201 si la crea y 200 si la edita
export async function responder(req, res) {
  const { creada, encuesta } = await encuestasService.responderEncuesta(req.params.codigo, req.body ?? {}, req.usuario)
  res.status(creada ? 201 : 200).json(encuesta)
}
