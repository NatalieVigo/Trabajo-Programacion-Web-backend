import * as metricasService from '../services/metricas.service.js'

// HU-7: el rango llega en la query (?desde=AAAA-MM-DD&hasta=AAAA-MM-DD); solo lo ve el supervisor (ver la ruta)
export async function obtenerTablero(req, res) {
  res.json(await metricasService.obtenerTablero({ desde: req.query.desde, hasta: req.query.hasta }))
}

export async function obtenerCargaTecnicos(req, res) {
  res.json(await metricasService.obtenerCargaTecnicos({ desde: req.query.desde, hasta: req.query.hasta }))
}
