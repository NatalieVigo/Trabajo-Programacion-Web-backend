import { Router } from 'express'
import * as ubicacionesController from '../controllers/ubicaciones.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// /api/sedes — sedes con sus pabellones (p14), solo para el supervisor
const router = Router()

router.use(autenticar, permitirRoles('supervisor'))

router.get('/', ubicacionesController.listarSedes)
router.post('/', ubicacionesController.crearSede)
router.patch('/:id', ubicacionesController.actualizarSede)
router.delete('/:id', ubicacionesController.eliminarSede)

export default router
