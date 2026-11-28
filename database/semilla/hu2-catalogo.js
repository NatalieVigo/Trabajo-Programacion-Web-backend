import { insertarFilas } from './insertarFilas.js'

const COLUMNAS_CATEGORIA = ['nombre', 'descripcion', 'activa', 'prioridad_por_defecto', 'tiempo_esperado_horas']
const valoresCategoria = (fila) => [fila.nombre, fila.descripcion, fila.activa, fila.prioridadPorDefecto, fila.tiempoEsperadoHoras]

// HU-2: categorías, subcategorías, sedes, pabellones, ambientes y técnicos habilitados
export async function cargarCatalogo(conexion, seed) {
  await insertarFilas(
    conexion,
    'categorias',
    ['id', ...COLUMNAS_CATEGORIA],
    seed.categorias.map((categoria) => [categoria.id, ...valoresCategoria(categoria)]),
  )
  await insertarFilas(
    conexion,
    'subcategorias',
    ['id', 'categoria_id', ...COLUMNAS_CATEGORIA],
    seed.subcategorias.map((sub) => [sub.id, sub.categoriaId, ...valoresCategoria(sub)]),
  )
  await insertarFilas(conexion, 'sedes', ['id', 'nombre'], seed.sedes.map(({ id, nombre }) => [id, nombre]))
  await insertarFilas(
    conexion,
    'pabellones',
    ['id', 'sede_id', 'nombre'],
    seed.pabellones.map(({ id, sedeId, nombre }) => [id, sedeId, nombre]),
  )
  await insertarFilas(
    conexion,
    'ambientes',
    ['id', 'codigo', 'nombre', 'tipo', 'pabellon_id', 'piso', 'capacidad'],
    seed.ambientes.map((ambiente) => [
      ambiente.id, ambiente.codigo, ambiente.nombre, ambiente.tipo, ambiente.pabellonId, ambiente.piso, ambiente.capacidad,
    ]),
  )
  await insertarFilas(
    conexion,
    'habilitaciones',
    ['id', 'tecnico_id', 'categoria_id'],
    seed.habilitaciones.map(({ id, tecnicoId, categoriaId }) => [id, tecnicoId, categoriaId]),
  )
}
