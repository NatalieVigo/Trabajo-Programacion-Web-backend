import { Router } from 'express'
import * as atencionController from '../controllers/atencion.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

// /api/atencion — HU-5 Atención y cierre (p24 a p27). Quién puede ver o cambiar cada ticket lo revisa el servicio:
// quien lo reportó, el técnico asignado o el supervisor.
const router = Router()

router.use(autenticar)

// tickets que tiene o tuvo el técnico (p24)
router.get('/', permitirRoles('tecnico'), atencionController.listarAtendidos)

// atención del ticket con su bitácora (p25) e historial de cambios (p27)
router.get('/:codigo', atencionController.obtener)
router.get('/:codigo/historial', atencionController.historial)

// comentario público o nota interna (p25), cambio de estado y cierre con la solución (p26)
router.post('/:codigo/bitacora', atencionController.agregarEntrada)
router.patch('/:codigo/estado', atencionController.cambiarEstado)
router.patch('/:codigo/cierre', atencionController.cerrar)

export default router
