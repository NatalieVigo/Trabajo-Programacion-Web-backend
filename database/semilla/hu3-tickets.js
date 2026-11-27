import { fecha, insertarFilas } from './insertarFilas.js'

// HU-3 (mínimo): solo las columnas que leen HU-1 y HU-2
export async function cargarTickets(conexion, seed) {
  await insertarFilas(
    conexion,
    'tickets',
    ['id', 'codigo', 'usuario_id', 'categoria_id', 'subcategoria_id', 'ambiente_id', 'asignado_a', 'estado', 'cerrado_en'],
    seed.tickets.map((ticket) => [
      ticket.id, ticket.codigo, ticket.usuarioId, ticket.categoriaId, ticket.subcategoriaId ?? null, ticket.ambienteId,
      ticket.asignadoA, ticket.estado, fecha(ticket.cerradoEn),
    ]),
  )
}
