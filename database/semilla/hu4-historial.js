import { fecha, insertarFilas } from './insertarFilas.js'

// HU-4: historial de los tickets del seed (estados y asignaciones)
export async function cargarHistorial(conexion, seed) {
  await insertarFilas(
    conexion,
    'historial',
    [
      'id', 'ticket_id', 'tipo', 'estado', 'asignado_a', 'autor_id', 'motivo', 'retorno_estimado', 'solucion',
      'prioridad_anterior', 'prioridad_nueva', 'creado_en',
    ],
    seed.historial.map((evento) => [
      evento.id, evento.ticketId, evento.tipo, evento.estado ?? null, evento.asignadoA ?? null, evento.autorId,
      evento.motivo ?? null, fecha(evento.retornoEstimado), evento.solucion ?? null, evento.prioridadAnterior ?? null,
      evento.prioridadNueva ?? null, fecha(evento.creadoEn),
    ]),
  )
}
