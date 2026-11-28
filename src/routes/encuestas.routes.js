import { Router } from 'express'
import * as encuestasController from '../controllers/encuestas.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// /api/encuestas — HU-6 Encuesta de satisfacción
const router = Router()

// las encuestas que respondió la persona (p28)
router.get('/', autenticar, encuestasController.listarMias)

// satisfacción por técnico y categoría (p29); va antes de /:codigo
router.get('/satisfaccion', autenticar, permitirRoles('supervisor'), encuestasController.obtenerSatisfaccion)

// la encuesta de un ticket propio (p27): verla y responderla o editarla
router.get('/:codigo', autenticar, encuestasController.obtener)
router.put('/:codigo', autenticar, encuestasController.responder)

export default router
