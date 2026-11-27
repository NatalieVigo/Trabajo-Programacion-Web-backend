import { insertarFilas } from './insertarFilas.js'

// HU-7: listas de unidades y vínculos (en el seed son listas de nombres)
export async function cargarUnidades(conexion, seed) {
  await insertarFilas(conexion, 'unidades', ['nombre'], seed.unidades.map((nombre) => [nombre]))
  await insertarFilas(conexion, 'vinculos', ['nombre'], seed.vinculos.map((nombre) => [nombre]))
}
