import { RepositoryBase, db } from './RepositoryBase.js'

// HU-2: categorías y subcategorías (p12 y p13). t es la transacción opcional (ver RepositoryBase).
const categorias = new RepositoryBase(db.categoria)
const subcategorias = new RepositoryBase(db.subcategoria)

const CAMPOS = ['nombre', 'descripcion', 'activa', 'prioridadPorDefecto', 'tiempoEsperadoHoras']

// solo los campos de la tabla, aunque el objeto traiga otros
const soloCampos = (datos, campos) => Object.fromEntries(campos.map((campo) => [campo, datos[campo]]))

const POR_ID = [['id', 'ASC']]

export const categoriasRepository = {
  listar({ soloActivas = false } = {}, t) {
    return categorias.listar({ where: soloActivas ? { activa: true } : {}, order: POR_ID }, t)
  },

  buscar(id, t) {
    return categorias.buscarPorId(id, t)
  },

  async insertar(categoria, t) {
    await categorias.crear(soloCampos(categoria, ['id', ...CAMPOS]), t)
  },

  async actualizar(id, campos, t) {
    await categorias.actualizar({ id }, soloCampos(campos, CAMPOS), t)
  },

  async cambiarEstado(id, activa, t) {
    await categorias.actualizar({ id }, { activa }, t)
  },

  // sus habilitaciones se borran solas (ON DELETE CASCADE)
  async eliminar(id, t) {
    await categorias.eliminar({ id }, t)
  },

  // ids del contrato de datos, como 'cat-08'
  nuevoId(t) {
    return categorias.siguienteId('cat', t, 2)
  },
}

export const subcategoriasRepository = {
  listar({ categoriaId, soloActivas = false } = {}, t) {
    const where = {}
    if (categoriaId) where.categoriaId = categoriaId
    if (soloActivas) where.activa = true
    return subcategorias.listar({ where, order: POR_ID }, t)
  },

  buscar(id, t) {
    return subcategorias.buscarPorId(id, t)
  },

  async insertar(subcategoria, t) {
    await subcategorias.crear(soloCampos(subcategoria, ['id', 'categoriaId', ...CAMPOS]), t)
  },

  async actualizar(id, campos, t) {
    await subcategorias.actualizar({ id }, soloCampos(campos, ['categoriaId', ...CAMPOS]), t)
  },

  async cambiarEstado(id, activa, t) {
    await subcategorias.actualizar({ id }, { activa }, t)
  },

  async eliminar(id, t) {
    await subcategorias.eliminar({ id }, t)
  },

  // como 'sub-21'
  nuevoId(t) {
    return subcategorias.siguienteId('sub', t, 2)
  },
}
