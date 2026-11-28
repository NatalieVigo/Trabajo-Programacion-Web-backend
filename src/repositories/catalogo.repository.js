import { RepositoryBase, db } from './RepositoryBase.js'

// Listas que usan los formularios de HU-1. Unidades y vínculos son de HU-7; categorías y ambientes son de HU-2.
// HU-1 solo las lee.
const unidades = new RepositoryBase(db.unidad)
const vinculos = new RepositoryBase(db.vinculo)
const categorias = new RepositoryBase(db.categoria)
const ambientes = new RepositoryBase(db.ambiente)

export const catalogoRepository = {
  async listarUnidades() {
    const filas = await unidades.listar({ attributes: ['nombre'], order: [['id', 'ASC']] })
    return filas.map((fila) => fila.nombre)
  },

  async listarVinculos() {
    const filas = await vinculos.listar({ attributes: ['nombre'], order: [['id', 'ASC']] })
    return filas.map((fila) => fila.nombre)
  },

  listarCategoriasActivas() {
    return categorias.listar({ attributes: ['id', 'nombre'], where: { activa: true }, order: [['id', 'ASC']] })
  },

  listarAmbientes() {
    return ambientes.listar({ attributes: ['id', 'codigo', 'nombre'], order: [['codigo', 'ASC']] })
  },
}
