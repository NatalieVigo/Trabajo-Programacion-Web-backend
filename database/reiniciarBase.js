import { readdir, readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { cargarCuentas } from './semilla/hu1-cuentas.js'
import { cargarCatalogo } from './semilla/hu2-catalogo.js'
import { cargarTickets } from './semilla/hu3-tickets.js'
import { cargarHistorial } from './semilla/hu4-historial.js'
import { cargarBitacora } from './semilla/hu5-bitacora.js'
import { cargarEncuestas } from './semilla/hu6-encuestas.js'
import { cargarUnidades } from './semilla/hu7-unidades.js'

const ESQUEMA = new URL('./esquema/', import.meta.url)
// copia del seed de la entrega 1 (frontend/src/data/seed.json del repo del frontend, enunciado §9)
const SEED = new URL('./seed.json', import.meta.url)

// mismo orden que los archivos del esquema
const CARGAS = [cargarCatalogo, cargarUnidades, cargarCuentas, cargarTickets, cargarEncuestas, cargarHistorial, cargarBitacora]

// Borra la base, la crea con los archivos de database/esquema y carga el seed.
export async function reiniciarBase({ host, port, user, password, database }) {
  if (!/^\w+$/.test(database)) throw new Error(`Nombre de base no válido: «${database}».`)
  const conexion = await mysql.createConnection({ host, port, user, password, multipleStatements: true, timezone: 'Z', charset: 'utf8mb4' })
  try {
    await conexion.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await conexion.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await conexion.query(`USE \`${database}\``)

    const archivos = (await readdir(ESQUEMA)).filter((archivo) => archivo.endsWith('.sql')).sort()
    for (const archivo of archivos) await conexion.query(await readFile(new URL(archivo, ESQUEMA), 'utf8'))

    // el seed tiene referencias cruzadas (usuarios ↔ invitaciones), por eso se cargan sin revisar llaves
    const seed = JSON.parse(await readFile(SEED, 'utf8'))
    await conexion.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const cargar of CARGAS) await cargar(conexion, seed)
    await conexion.query('SET FOREIGN_KEY_CHECKS = 1')
  } finally {
    await conexion.end()
  }
}
