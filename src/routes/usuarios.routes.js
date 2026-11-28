import { Router } from 'express'
import * as usuariosController from '../controllers/usuarios.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// HU-7 Gestión de usuarios (p32 y p33)
const router = Router()
const supervisor = [autenticar, permitirRoles('supervisor')]

router.get('/', supervisor, usuariosController.listarCuentas)
router.get('/:id', supervisor, usuariosController.obtenerFicha)
router.patch('/:id/bloqueo', supervisor, usuariosController.bloquear)
router.patch('/:id/desbloqueo', supervisor, usuariosController.desbloquear)

export default router
