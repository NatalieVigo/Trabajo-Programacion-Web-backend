import { fecha, insertarFilas } from './insertarFilas.js'

// HU-3 (mínimo): solo las columnas que leen HU-1, HU-2 y HU-4
export async function cargarTickets(conexion, seed) {
  await insertarFilas(
    conexion,
    'tickets',
    [
      'id', 'codigo', 'usuario_id', 'categoria_id', 'subcategoria_id', 'ambiente_id', 'asunto', 'asignado_a', 'estado',
      'prioridad', 'tiempo_esperado_horas', 'creado_en', 'cerrado_en',
    ],
    seed.tickets.map((ticket) => [
      ticket.id, ticket.codigo, ticket.usuarioId, ticket.categoriaId, ticket.subcategoriaId ?? null, ticket.ambienteId,
      ticket.asunto, ticket.asignadoA, ticket.estado, ticket.prioridad, ticket.tiempoEsperadoHoras ?? null,
      fecha(ticket.creadoEn), fecha(ticket.cerradoEn),
    ]),
  )
}
