import { Op, fn, literal } from 'sequelize'
import db from '../db/models/index.cjs'

// Operaciones comunes sobre un modelo de Sequelize. Cada repositorio la extiende y agrega sus consultas.
// Devuelve objetos simples (no instancias del modelo), con los nombres del contrato de datos.
// t es la transacción opcional; con bloquear, la fila queda reservada hasta que la transacción termine (FOR UPDATE).
export class RepositoryBase {
  constructor(modelo) {
    this.modelo = modelo
  }

  // opciones de Sequelize para participar de una transacción
  opciones(t, { bloquear = false } = {}) {
    if (!t) return {}
    return bloquear ? { transaction: t, lock: t.LOCK.UPDATE } : { transaction: t }
  }

  async listar(consulta = {}, t) {
    const filas = await this.modelo.findAll({ ...consulta, ...this.opciones(t) })
    return filas.map(aObjeto)
  }

  async buscarPorId(id, t, { bloquear = false } = {}) {
    return aObjeto(await this.modelo.findByPk(id, this.opciones(t, { bloquear })))
  }

  async buscarUno(consulta, t, { bloquear = false } = {}) {
    return aObjeto(await this.modelo.findOne({ ...consulta, ...this.opciones(t, { bloquear }) }))
  }

  async existe(where, t) {
    return (await this.modelo.count({ where, ...this.opciones(t) })) > 0
  }

  async contar(where, t) {
    return this.modelo.count({ where, ...this.opciones(t) })
  }

  async crear(datos, t) {
    return aObjeto(await this.modelo.create(datos, this.opciones(t)))
  }

  // devuelve cuántas filas cambió
  async actualizar(where, cambios, t) {
    const [cambiadas] = await this.modelo.update(cambios, { where, ...this.opciones(t) })
    return cambiadas
  }

  async eliminar(where, t) {
    return this.modelo.destroy({ where, ...this.opciones(t) })
  }

  // ids del contrato de datos, como 'usr-011'; el bloqueo evita que dos altas tomen el mismo número
  async siguienteId(prefijo, t, digitos = 3) {
    const desde = prefijo.length + 2
    const fila = await this.modelo.findOne({
      attributes: [[fn('MAX', literal(`CAST(SUBSTRING(id, ${desde}) AS UNSIGNED)`)), 'ultimo']],
      where: { id: { [Op.like]: `${prefijo}-%` } },
      raw: true,
      ...this.opciones(t, { bloquear: true }),
    })
    return `${prefijo}-${String(Number(fila?.ultimo ?? 0) + 1).padStart(digitos, '0')}`
  }
}

const aObjeto = (instancia) => instancia?.get({ plain: true }) ?? null

// todo lo que haga operacion se confirma junto o se deshace junto; operacion recibe la transacción
export function enTransaccion(operacion) {
  return db.sequelize.transaction(operacion)
}

// lo lanza MySQL cuando se repite un valor UNIQUE (por ejemplo, dos registros a la vez con el mismo correo)
export function esDuplicado(error) {
  return error?.name === 'SequelizeUniqueConstraintError'
}

export { db }
