import { Op, col, fn, literal } from 'sequelize'
import { RepositoryBase, db } from './RepositoryBase.js'

// mismo criterio que los tickets "abiertos" de HU-1
export const ESTADOS_EN_CURSO = Object.freeze(['abierto', 'en_atencion', 'en_espera', 'reabierto'])

// solo estos campos de tickets se pueden agrupar; así el campo nunca viene de la petición
const CAMPOS_TICKET = Object.freeze(['categoriaId', 'subcategoriaId', 'ambienteId', 'asignadoA'])

const tickets = new RepositoryBase(db.ticket)
const usuarios = new RepositoryBase(db.usuario)

// 1 si el ticket sigue en curso; Sequelize escapa los estados
const enCurso = literal(`estado IN (${ESTADOS_EN_CURSO.map((estado) => db.sequelize.escape(estado)).join(', ')})`)

// columna de MySQL de un campo del modelo (categoriaId → categoria_id)
const columna = (modelo, campo) => col(modelo.getAttributes()[campo].field)

const contarPor = (filas) => new Map(filas.map((fila) => [fila.clave, Number(fila.total)]))

// Lo que HU-2 lee de otras historias, sin modificarlo: tickets (HU-3) y cuentas (HU-1).
export const usosCatalogoRepository = {
  // Map de { total, enCurso } por categoría, subcategoría, ambiente o técnico
  async ticketsPor(campo, t) {
    if (!CAMPOS_TICKET.includes(campo)) throw new Error(`Los tickets no se agrupan por «${campo}».`)
    const filas = await tickets.listar(
      {
        attributes: [
          [columna(db.ticket, campo), 'clave'],
          [fn('COUNT', col('id')), 'total'],
          [fn('SUM', enCurso), 'enCurso'],
        ],
        where: { [campo]: { [Op.ne]: null } },
        group: [columna(db.ticket, campo)],
      },
      t,
    )
    return new Map(filas.map((fila) => [fila.clave, { total: Number(fila.total), enCurso: Number(fila.enCurso ?? 0) }]))
  },

  // técnicos que declararon la categoría como especialidad al aceptar su invitación (columna JSON de HU-1)
  async especialidadesPorCategoria(t) {
    const filas = await usuarios.listar({ attributes: ['especialidades'] }, t)
    const conteo = new Map()
    for (const { especialidades } of filas) {
      for (const categoriaId of especialidades) conteo.set(categoriaId, (conteo.get(categoriaId) ?? 0) + 1)
    }
    return conteo
  },

  tecnicosActivos(t) {
    return usuarios.listar(
      {
        attributes: ['id', 'nombres', 'apellidos', 'especialidades'],
        where: { rol: 'tecnico', estado: 'activo' },
        order: [['id', 'ASC']],
      },
      t,
    )
  },

  async usuariosPorAmbienteHabitual(t) {
    const filas = await usuarios.listar(
      {
        attributes: [[columna(db.usuario, 'ambienteHabitualId'), 'clave'], [fn('COUNT', col('id')), 'total']],
        where: { ambienteHabitualId: { [Op.ne]: null } },
        group: [columna(db.usuario, 'ambienteHabitualId')],
      },
      t,
    )
    return contarPor(filas)
  },
}
