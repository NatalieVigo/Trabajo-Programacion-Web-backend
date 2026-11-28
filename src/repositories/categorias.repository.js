import { pool } from '../db/pool.js'

const COLUMNAS = 'id, nombre, descripcion, activa, prioridad_por_defecto, tiempo_esperado_horas'

// de columnas de MySQL a los nombres del contrato de datos
function aCategoria(fila) {
  if (!fila) return null
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    activa: fila.activa,
    prioridadPorDefecto: fila.prioridad_por_defecto,
    tiempoEsperadoHoras: fila.tiempo_esperado_horas,
  }
}

const aSubcategoria = (fila) => (fila ? { ...aCategoria(fila), categoriaId: fila.categoria_id } : null)

const valores = (campos) => [
  campos.nombre, campos.descripcion, campos.activa, campos.prioridadPorDefecto, campos.tiempoEsperadoHoras,
]

// db puede ser el pool o la conexión de una transacción
export const categoriasRepository = {
  async listar({ soloActivas = false } = {}, db = pool) {
    const [filas] = await db.query(`SELECT ${COLUMNAS} FROM categorias ${soloActivas ? 'WHERE activa = TRUE' : ''}`)
    return filas.map(aCategoria)
  },

  async buscar(id, db = pool) {
    const [filas] = await db.query(`SELECT ${COLUMNAS} FROM categorias WHERE id = ?`, [id])
    return aCategoria(filas[0])
  },

  async insertar(categoria, db = pool) {
    await db.query(
      `INSERT INTO categorias (${COLUMNAS}) VALUES (?, ?, ?, ?, ?, ?)`,
      [categoria.id, ...valores(categoria)],
    )
  },

  async actualizar(id, campos, db = pool) {
    await db.query(
      `UPDATE categorias SET nombre = ?, descripcion = ?, activa = ?, prioridad_por_defecto = ?,
        tiempo_esperado_horas = ? WHERE id = ?`,
      [...valores(campos), id],
    )
  },

  async cambiarEstado(id, activa, db = pool) {
    await db.query('UPDATE categorias SET activa = ? WHERE id = ?', [activa, id])
  },

  // sus habilitaciones se borran solas (ON DELETE CASCADE)
  async eliminar(id, db = pool) {
    await db.query('DELETE FROM categorias WHERE id = ?', [id])
  },
}

export const subcategoriasRepository = {
  async listar({ categoriaId, soloActivas = false } = {}, db = pool) {
    const condiciones = []
    const parametros = []
    if (categoriaId) {
      condiciones.push('categoria_id = ?')
      parametros.push(categoriaId)
    }
    if (soloActivas) condiciones.push('activa = TRUE')
    const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : ''
    const [filas] = await db.query(`SELECT ${COLUMNAS}, categoria_id FROM subcategorias ${donde}`, parametros)
    return filas.map(aSubcategoria)
  },

  async buscar(id, db = pool) {
    const [filas] = await db.query(`SELECT ${COLUMNAS}, categoria_id FROM subcategorias WHERE id = ?`, [id])
    return aSubcategoria(filas[0])
  },

  async insertar(subcategoria, db = pool) {
    await db.query(
      `INSERT INTO subcategorias (${COLUMNAS}, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [subcategoria.id, ...valores(subcategoria), subcategoria.categoriaId],
    )
  },

  async actualizar(id, campos, db = pool) {
    await db.query(
      `UPDATE subcategorias SET nombre = ?, descripcion = ?, activa = ?, prioridad_por_defecto = ?,
        tiempo_esperado_horas = ?, categoria_id = ? WHERE id = ?`,
      [...valores(campos), campos.categoriaId, id],
    )
  },

  async cambiarEstado(id, activa, db = pool) {
    await db.query('UPDATE subcategorias SET activa = ? WHERE id = ?', [activa, id])
  },

  async eliminar(id, db = pool) {
    await db.query('DELETE FROM subcategorias WHERE id = ?', [id])
  },
}
