import { Router } from 'express'
import * as habilitacionesController from '../controllers/habilitaciones.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// /api/habilitaciones — matriz de técnicos por categoría (p16), solo para el supervisor
const router = Router()

router.use(autenticar, permitirRoles('supervisor'))

router.get('/', habilitacionesController.obtener)
// PUT porque se manda la lista completa de categorías de cada técnico que cambió
router.put('/', habilitacionesController.guardar)

export default router
