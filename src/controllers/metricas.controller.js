import * as metricasService from '../services/metricas.service.js'

export async function obtenerTablero(req, res) {
  const datos = await metricasService.obtenerTablero(req.query)
  res.json(datos)
}

export async function obtenerCargaTecnicos(req, res) {
  const carga = await metricasService.obtenerCargaTecnicos(req.query)
  res.json(carga)
}