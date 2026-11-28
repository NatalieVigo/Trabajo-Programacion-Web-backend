import { pool } from '../db/pool.js'

// Lo que HU-4 lee y escribe en tickets (HU-3), junto con los nombres de catálogo y personas que muestra la cola.
const SELECT_TICKET = `
  SELECT t.id, t.codigo, t.asunto, t.categoria_id, t.subcategoria_id, t.ambiente_id, t.usuario_id, t.asignado_a,
         t.prioridad, t.estado, t.tiempo_esperado_horas, t.creado_en, t.cerrado_en,
         c.nombre AS categoria, c.tiempo_esperado_horas AS categoria_horas,
         s.nombre AS subcategoria, s.tiempo_esperado_horas AS subcategoria_horas,
         a.codigo AS ambiente_codigo, a.nombre AS ambiente_nombre,
         u.nombres AS solicitante_nombres, u.apellidos AS solicitante_apellidos,
         tec.nombres AS tecnico_nombres, tec.apellidos AS tecnico_apellidos
  FROM tickets t
  LEFT JOIN categorias c ON c.id = t.categoria_id
  LEFT JOIN subcategorias s ON s.id = t.subcategoria_id
  LEFT JOIN ambientes a ON a.id = t.ambiente_id
  LEFT JOIN usuarios u ON u.id = t.usuario_id
  LEFT JOIN usuarios tec ON tec.id = t.asignado_a`

const persona = (nombres, apellidos) => (nombres ? { nombres, apellidos } : null)

const aTicket = (fila) => ({
  id: fila.id,
  codigo: fila.codigo,
  asunto: fila.asunto,
  categoriaId: fila.categoria_id,
  subcategoriaId: fila.subcategoria_id,
  ambienteId: fila.ambiente_id,
  usuarioId: fila.usuario_id,
  asignadoA: fila.asignado_a,
  prioridad: fila.prioridad,
  estado: fila.estado,
  tiempoEsperadoHoras: fila.tiempo_esperado_horas,
  creadoEn: fila.creado_en,
  cerradoEn: fila.cerrado_en,
  categoria: fila.categoria,
  categoriaHoras: fila.categoria_horas,
  subcategoria: fila.subcategoria,
  subcategoriaHoras: fila.subcategoria_horas,
  ambiente: fila.ambiente_codigo ?? fila.ambiente_nombre,
  solicitante: persona(fila.solicitante_nombres, fila.solicitante_apellidos),
  tecnico: persona(fila.tecnico_nombres, fila.tecnico_apellidos),
})

// db puede ser el pool o la conexión de una transacción
export const colaRepository = {
  // filtros: estados (lista), asignadoA (id) o sinAsignar (true)
  async listarTickets({ estados, asignadoA, sinAsignar } = {}, db = pool) {
    const condiciones = []
    const valores = []
    if (estados?.length) {
      condiciones.push('t.estado IN (?)')
      valores.push(estados)
    }
    if (asignadoA) {
      condiciones.push('t.asignado_a = ?')
      valores.push(asignadoA)
    }
    if (sinAsignar) condiciones.push('t.asignado_a IS NULL')
    const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : ''
    const [filas] = await db.query(`${SELECT_TICKET}${where} ORDER BY t.creado_en`, valores)
    return filas.map(aTicket)
  },

  // FOR UPDATE: bloquea los tickets hasta terminar la transacción, así dos supervisores no los cambian a la vez
  async bloquearTickets(ids, db) {
    const [filas] = await db.query(
      'SELECT id, categoria_id, asignado_a, estado, prioridad FROM tickets WHERE id IN (?) FOR UPDATE',
      [ids],
    )
    return filas.map((fila) => ({
      id: fila.id,
      categoriaId: fila.categoria_id,
      asignadoA: fila.asignado_a,
      estado: fila.estado,
      prioridad: fila.prioridad,
    }))
  },

  async asignar(id, tecnicoId, db = pool) {
    await db.query('UPDATE tickets SET asignado_a = ? WHERE id = ?', [tecnicoId, id])
  },

  async cambiarPrioridad(id, prioridad, horas, db = pool) {
    await db.query('UPDATE tickets SET prioridad = ?, tiempo_esperado_horas = ? WHERE id = ?', [prioridad, horas, id])
  },

  // vuelve a la cola: sin técnico y abierto
  async devolver(id, db = pool) {
    await db.query("UPDATE tickets SET asignado_a = NULL, estado = 'abierto', cerrado_en = NULL WHERE id = ?", [id])
  },

  async categorias(db = pool) {
    const [filas] = await db.query('SELECT id, nombre FROM categorias ORDER BY nombre')
    return filas
  },

  async ambientes(db = pool) {
    const [filas] = await db.query('SELECT id, codigo, nombre FROM ambientes ORDER BY codigo')
    return filas.map(({ id, codigo, nombre }) => ({ id, nombre: codigo ?? nombre }))
  },
}
