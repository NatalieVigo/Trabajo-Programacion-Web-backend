import { readFile } from 'node:fs/promises'
import { cargarCatalogo } from '../database/semilla/hu2-catalogo.js'
import { cargarTickets } from '../database/semilla/hu3-tickets.js'
import { pool } from '../src/db/pool.js'
import { api, conToken } from './ayuda.js'

const seed = JSON.parse(await readFile(new URL('../database/seed.json', import.meta.url), 'utf8'))

const TABLAS = ['habilitaciones', 'tickets', 'ambientes', 'pabellones', 'sedes', 'subcategorias', 'categorias']

// Deja el catálogo y los tickets como en el seed, para que cada prueba de HU-2 empiece igual.
// Con las llaves foráneas apagadas el borrado no toca las cuentas de HU-1.
export async function restaurarCatalogo() {
  const conexion = await pool.getConnection()
  try {
    await conexion.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const tabla of TABLAS) await conexion.query(`DELETE FROM ${tabla}`)
    await cargarCatalogo(conexion, seed)
    await cargarTickets(conexion, seed)
  } finally {
    await conexion.query('SET FOREIGN_KEY_CHECKS = 1')
    conexion.release()
  }
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
  return pool.query('UPDATE tickets SET ? WHERE id = ?', [cambios, id])
}

export async function contarFilas(tabla) {
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${tabla}`)
  return Number(total)
}
