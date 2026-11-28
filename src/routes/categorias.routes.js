import { Router } from 'express'
import * as categoriasController from '../controllers/categorias.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// /api/categorias — categorías y subcategorías del catálogo (p12 y p13)
const router = Router()

router.use(autenticar)

// la lee HU-3 al registrar un ticket, así que sirve para cualquier rol; va antes de /:id
router.get('/disponibles', categoriasController.disponibles)

// el resto solo lo administra el supervisor
router.use(permitirRoles('supervisor'))

router.get('/', categoriasController.listar)
router.post('/', categoriasController.crear)
router.get('/:id', categoriasController.obtener)
router.patch('/:id', categoriasController.actualizar)
router.patch('/:id/estado', categoriasController.cambiarEstado)
router.delete('/:id', categoriasController.eliminar)

export default router
