import { pool } from '../db/pool.js'

const aHabilitacion = (fila) => ({ id: fila.id, tecnicoId: fila.tecnico_id, categoriaId: fila.categoria_id })

// técnicos habilitados por categoría (p16); db puede ser el pool o la conexión de una transacción
export const habilitacionesRepository = {
  async listar({ tecnicoId } = {}, db = pool) {
    const [filas] = tecnicoId
      ? await db.query('SELECT id, tecnico_id, categoria_id FROM habilitaciones WHERE tecnico_id = ?', [tecnicoId])
      : await db.query('SELECT id, tecnico_id, categoria_id FROM habilitaciones')
    return filas.map(aHabilitacion)
  },

  async insertar({ id, tecnicoId, categoriaId }, db = pool) {
    await db.query('INSERT INTO habilitaciones (id, tecnico_id, categoria_id) VALUES (?, ?, ?)', [id, tecnicoId, categoriaId])
  },

  async eliminar(id, db = pool) {
    await db.query('DELETE FROM habilitaciones WHERE id = ?', [id])
  },
}
