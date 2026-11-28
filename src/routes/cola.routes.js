import { Router } from 'express'
import * as colaController from '../controllers/cola.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// /api/cola — HU-4 Cola y asignación (p22 a p24)
const router = Router()

const supervisor = [autenticar, permitirRoles('supervisor')]
const tecnico = [autenticar, permitirRoles('tecnico')]

// cola general (p22) y bandeja del técnico (p24)
router.get('/', supervisor, colaController.listarCola)
router.get('/bandeja', tecnico, colaController.listarBandeja)

// acciones del supervisor sobre uno o varios tickets: { ids: [...] }
router.post('/asignaciones', supervisor, colaController.asignar)
router.patch('/prioridad', supervisor, colaController.cambiarPrioridad)
router.post('/devoluciones', supervisor, colaController.devolver)

// el técnico se asigna un ticket de sus categorías
router.post('/:ticketId/autoasignacion', tecnico, colaController.autoasignar)

export default router
