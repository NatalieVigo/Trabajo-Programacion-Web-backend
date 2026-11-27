import { Router } from 'express'
import * as ubicacionesController from '../controllers/ubicaciones.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// /api/pabellones — se listan junto con su sede en GET /api/sedes (p14)
const router = Router()

router.use(autenticar, permitirRoles('supervisor'))

router.post('/', ubicacionesController.crearPabellon)
router.patch('/:id', ubicacionesController.actualizarPabellon)
router.delete('/:id', ubicacionesController.eliminarPabellon)

export default router
