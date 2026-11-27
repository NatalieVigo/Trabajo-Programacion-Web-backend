import { pool } from '../db/pool.js'

// de columnas de MySQL a los nombres del contrato de datos
const aPabellon = (fila) => (fila ? { id: fila.id, sedeId: fila.sede_id, nombre: fila.nombre } : null)

function aAmbiente(fila) {
  if (!fila) return null
  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    tipo: fila.tipo,
    pabellonId: fila.pabellon_id,
    piso: fila.piso,
    capacidad: fila.capacidad,
  }
}

const COLUMNAS_AMBIENTE = 'id, codigo, nombre, tipo, pabellon_id, piso, capacidad'

// db puede ser el pool o la conexión de una transacción
export const sedesRepository = {
  async listar(db = pool) {
    const [filas] = await db.query('SELECT id, nombre FROM sedes')
    return filas
  },

  async buscar(id, db = pool) {
    const [filas] = await db.query('SELECT id, nombre FROM sedes WHERE id = ?', [id])
    return filas[0] ?? null
  },

  async insertar({ id, nombre }, db = pool) {
    await db.query('INSERT INTO sedes (id, nombre) VALUES (?, ?)', [id, nombre])
  },

  async actualizar(id, { nombre }, db = pool) {
    await db.query('UPDATE sedes SET nombre = ? WHERE id = ?', [nombre, id])
  },

  async eliminar(id, db = pool) {
    await db.query('DELETE FROM sedes WHERE id = ?', [id])
  },
}

export const pabellonesRepository = {
  async listar({ sedeId } = {}, db = pool) {
    const [filas] = sedeId
      ? await db.query('SELECT id, sede_id, nombre FROM pabellones WHERE sede_id = ?', [sedeId])
      : await db.query('SELECT id, sede_id, nombre FROM pabellones')
    return filas.map(aPabellon)
  },

  async buscar(id, db = pool) {
    const [filas] = await db.query('SELECT id, sede_id, nombre FROM pabellones WHERE id = ?', [id])
    return aPabellon(filas[0])
  },

  async insertar({ id, sedeId, nombre }, db = pool) {
    await db.query('INSERT INTO pabellones (id, sede_id, nombre) VALUES (?, ?, ?)', [id, sedeId, nombre])
  },

  async actualizar(id, { sedeId, nombre }, db = pool) {
    await db.query('UPDATE pabellones SET sede_id = ?, nombre = ? WHERE id = ?', [sedeId, nombre, id])
  },

  async eliminar(id, db = pool) {
    await db.query('DELETE FROM pabellones WHERE id = ?', [id])
  },
}

export const ambientesRepository = {
  async listar({ pabellonId } = {}, db = pool) {
    const [filas] = pabellonId
      ? await db.query(`SELECT ${COLUMNAS_AMBIENTE} FROM ambientes WHERE pabellon_id = ?`, [pabellonId])
      : await db.query(`SELECT ${COLUMNAS_AMBIENTE} FROM ambientes`)
    return filas.map(aAmbiente)
  },

  async buscar(id, db = pool) {
    const [filas] = await db.query(`SELECT ${COLUMNAS_AMBIENTE} FROM ambientes WHERE id = ?`, [id])
    return aAmbiente(filas[0])
  },

  async insertar(ambiente, db = pool) {
    await db.query(`INSERT INTO ambientes (${COLUMNAS_AMBIENTE}) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      ambiente.id, ambiente.codigo, ambiente.nombre, ambiente.tipo, ambiente.pabellonId, ambiente.piso, ambiente.capacidad,
    ])
  },

  async actualizar(id, campos, db = pool) {
    await db.query(
      'UPDATE ambientes SET codigo = ?, nombre = ?, tipo = ?, pabellon_id = ?, piso = ?, capacidad = ? WHERE id = ?',
      [campos.codigo, campos.nombre, campos.tipo, campos.pabellonId, campos.piso, campos.capacidad, id],
    )
  },

  async eliminar(id, db = pool) {
    await db.query('DELETE FROM ambientes WHERE id = ?', [id])
  },
}
