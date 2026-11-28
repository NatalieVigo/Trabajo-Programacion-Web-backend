import { Router } from 'express'
import * as ticketsController from '../controllers/tickets.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

const router = Router()

router.use(autenticar, permitirRoles('usuario'))
router.get('/duplicados', ticketsController.buscarDuplicado)
router.get('/', ticketsController.listarPropios)
router.post('/', ticketsController.crear)
router.patch('/:ticketId/cancelacion', ticketsController.cancelar)
router.patch('/:ticketId/reapertura', ticketsController.reabrir)

export default router
