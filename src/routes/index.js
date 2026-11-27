import { Router } from 'express'
import ambientesRoutes from './ambientes.routes.js'
import authRoutes from './auth.routes.js'
import categoriasRoutes from './categorias.routes.js'
import cuentaRoutes from './cuenta.routes.js'
import invitacionesRoutes from './invitaciones.routes.js'
import pabellonesRoutes from './pabellones.routes.js'
import sedesRoutes from './sedes.routes.js'
import solicitudesAccesoRoutes from './solicitudesAcceso.routes.js'

// Todas las rutas de la API; cada historia agrega aquí las suyas.
export const rutas = Router()

// HU-1 Cuenta y acceso
rutas.use('/auth', authRoutes)
rutas.use('/cuenta', cuentaRoutes)
rutas.use('/invitaciones', invitacionesRoutes)
rutas.use('/solicitudes-acceso', solicitudesAccesoRoutes)

// HU-2 Catálogo de servicios
rutas.use('/categorias', categoriasRoutes)
rutas.use('/sedes', sedesRoutes)
rutas.use('/pabellones', pabellonesRoutes)
rutas.use('/ambientes', ambientesRoutes)
