import { Router } from 'express'
import * as usuariosController from '../controllers/usuarios.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

const router = Router()
const supervisor = [autenticar, permitirRoles('supervisor')]

router.get('/', supervisor, usuariosController.listarUsuarios)
router.get('/:id', supervisor, usuariosController.obtenerUsuario)
router.patch('/:id/estado', supervisor, usuariosController.cambiarEstado)

export default router