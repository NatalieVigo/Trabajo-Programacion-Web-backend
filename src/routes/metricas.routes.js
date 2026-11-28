import { Router } from 'express'
import * as metricasController from '../controllers/metricas.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

const router = Router()
const supervisor = [autenticar, permitirRoles('supervisor')]

router.get('/tablero', supervisor, metricasController.obtenerTablero)
router.get('/carga-tecnicos', supervisor, metricasController.obtenerCargaTecnicos)

export default router