import { Router } from 'express'
import ambientesRoutes from './ambientes.routes.js'
import atencionRoutes from './atencion.routes.js'
import authRoutes from './auth.routes.js'
import categoriasRoutes from './categorias.routes.js'
import colaRoutes from './cola.routes.js'
import cuentaRoutes from './cuenta.routes.js'
import habilitacionesRoutes from './habilitaciones.routes.js'
import invitacionesRoutes from './invitaciones.routes.js'
import metricasRoutes from './metricas.routes.js'
import pabellonesRoutes from './pabellones.routes.js'
import sedesRoutes from './sedes.routes.js'
import solicitudesAccesoRoutes from './solicitudesAcceso.routes.js'
import ticketsRoutes from './tickets.routes.js'
import usuariosRoutes from './usuarios.routes.js'

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
rutas.use('/habilitaciones', habilitacionesRoutes)

// HU-3 Registro de tickets
rutas.use('/tickets', ticketsRoutes)

// HU-4 Cola y asignación
rutas.use('/cola', colaRoutes)

// HU-5 Atención y cierre
rutas.use('/atencion', atencionRoutes)

// HU-7 Métricas y gestión de usuarios
rutas.use('/metricas', metricasRoutes)
rutas.use('/usuarios', usuariosRoutes)
