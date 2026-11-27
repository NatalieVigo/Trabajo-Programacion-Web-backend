import { Router } from 'express'
import * as ubicacionesController from '../controllers/ubicaciones.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// /api/ambientes — aulas, laboratorios y demás ambientes del campus (p14 y el modal de p15)
const router = Router()

router.use(autenticar)

// la lee HU-3 para elegir el ambiente del ticket, así que sirve para cualquier rol
router.get('/', ubicacionesController.listarAmbientes)

// crear, editar y eliminar solo lo hace el supervisor
router.use(permitirRoles('supervisor'))

router.post('/', ubicacionesController.crearAmbiente)
router.patch('/:id', ubicacionesController.actualizarAmbiente)
router.delete('/:id', ubicacionesController.eliminarAmbiente)

export default router
