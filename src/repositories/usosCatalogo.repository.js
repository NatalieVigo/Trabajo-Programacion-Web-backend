import { pool } from '../db/pool.js'

// mismo criterio que los tickets "abiertos" de HU-1
export const ESTADOS_EN_CURSO = Object.freeze(['abierto', 'en_atencion', 'en_espera', 'reabierto'])

// solo estas columnas se pueden agrupar; así el nombre de la columna nunca viene de la petición
const COLUMNAS_TICKET = Object.freeze({
  categoriaId: 'categoria_id',
  subcategoriaId: 'subcategoria_id',
  ambienteId: 'ambiente_id',
  asignadoA: 'asignado_a',
})

const contarPor = (filas) => new Map(filas.map((fila) => [fila.clave, Number(fila.total)]))

// usuarios.especialidades es una columna JSON: llega como texto en MariaDB (XAMPP) y ya convertida en MySQL
const leerLista = (valor) => (typeof valor === 'string' ? JSON.parse(valor) : (valor ?? []))

// Lo que HU-2 lee de otras historias, sin modificarlo: tickets (HU-3) y cuentas (HU-1).
export const usosCatalogoRepository = {
  // Map de { total, enCurso } por categoría, subcategoría, ambiente o técnico
  async ticketsPor(campo, db = pool) {
    const columna = COLUMNAS_TICKET[campo]
    const [filas] = await db.query(
      `SELECT ${columna} AS clave, COUNT(*) AS total, SUM(estado IN (?)) AS en_curso
       FROM tickets WHERE ${columna} IS NOT NULL GROUP BY ${columna}`,
      [ESTADOS_EN_CURSO],
    )
    return new Map(filas.map((fila) => [fila.clave, { total: Number(fila.total), enCurso: Number(fila.en_curso ?? 0) }]))
  },

  // técnicos que declararon la categoría como especialidad al aceptar su invitación
  async especialidadesPorCategoria(db = pool) {
    const [filas] = await db.query('SELECT especialidades FROM usuarios')
    const conteo = new Map()
    for (const fila of filas) {
      for (const categoriaId of leerLista(fila.especialidades)) conteo.set(categoriaId, (conteo.get(categoriaId) ?? 0) + 1)
    }
    return conteo
  },

  async tecnicosActivos(db = pool) {
    const [filas] = await db.query(
      "SELECT id, nombres, apellidos, especialidades FROM usuarios WHERE rol = 'tecnico' AND estado = 'activo'",
    )
    return filas.map(({ id, nombres, apellidos, especialidades }) => ({
      id,
      nombres,
      apellidos,
      especialidades: leerLista(especialidades),
    }))
  },

  async usuariosPorAmbienteHabitual(db = pool) {
    const [filas] = await db.query(
      `SELECT ambiente_habitual_id AS clave, COUNT(*) AS total FROM usuarios
       WHERE ambiente_habitual_id IS NOT NULL GROUP BY ambiente_habitual_id`,
    )
    return contarPor(filas)
  },
}
