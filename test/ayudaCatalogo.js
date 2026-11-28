import { readFile } from 'node:fs/promises'
import { QueryTypes } from 'sequelize'
import db from '../src/db/models/index.cjs'
import { api, conToken } from './ayuda.js'

const seed = JSON.parse(await readFile(new URL('../src/db/data/seed.json', import.meta.url), 'utf8'))

// los modelos usan los mismos nombres de campo que el seed; van del hijo al padre para borrarlos en ese orden
const FILAS_DEL_SEED = [
  ['habilitacion', seed.habilitaciones],
  ['ticket', seed.tickets],
  ['ambiente', seed.ambientes],
  ['pabellon', seed.pabellones],
  ['sede', seed.sedes],
  ['subcategoria', seed.subcategorias],
  ['categoria', seed.categorias],
]

// Deja el catálogo y los tickets como en el seed, para que cada prueba de HU-2 empiece igual.
// Con las llaves foráneas apagadas el borrado no toca las cuentas de HU-1. Va en una transacción para que todo use
// la misma conexión, que es donde vale el SET FOREIGN_KEY_CHECKS.
export async function restaurarCatalogo() {
  await db.sequelize.transaction(async (transaction) => {
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction })
    for (const [modelo] of FILAS_DEL_SEED) await db[modelo].destroy({ where: {}, transaction })
    for (const [modelo, filas] of [...FILAS_DEL_SEED].reverse()) await db[modelo].bulkCreate(filas, { transaction })
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction })
  })
}

// atajos para llamar a la API con una sesión: supervisora.post('/api/sedes', datos)
export function conSesion(token) {
  const pedir = (metodo, ruta, datos) => {
    const peticion = api()[metodo](ruta).set(conToken(token))
    return datos === undefined ? peticion : peticion.send(datos)
  }
  return {
    get: (ruta) => pedir('get', ruta),
    post: (ruta, datos) => pedir('post', ruta, datos),
    patch: (ruta, datos) => pedir('patch', ruta, datos),
    put: (ruta, datos) => pedir('put', ruta, datos),
    delete: (ruta) => pedir('delete', ruta),
  }
}

// como si HU-3 o HU-5 ya hubieran cambiado el ticket
export function actualizarTicket(id, cambios) {
  return db.ticket.update(cambios, { where: { id } })
}

// como si HU-7 hubiera bloqueado o desbloqueado la cuenta
export function cambiarEstadoDeCuenta(id, estado) {
  return db.usuario.update({ estado }, { where: { id } })
}

export async function contarFilas(tabla) {
  const [{ total }] = await db.sequelize.query(`SELECT COUNT(*) AS total FROM ${tabla}`, { type: QueryTypes.SELECT })
  return Number(total)
}

export { db }
