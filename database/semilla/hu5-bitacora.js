import { fecha, insertarFilas } from './insertarFilas.js'

// HU-5 (mínimo): la bitácora del seed, para que HU-4 pueda agregar notas internas
export async function cargarBitacora(conexion, seed) {
  await insertarFilas(
    conexion,
    'bitacora',
    ['id', 'ticket_id', 'autor_id', 'tipo', 'mensaje', 'creado_en'],
    seed.bitacora.map((nota) => [nota.id, nota.ticketId, nota.autorId, nota.tipo, nota.mensaje, fecha(nota.creadoEn)]),
  )
}
