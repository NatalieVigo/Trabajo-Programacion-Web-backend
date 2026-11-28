import { RepositoryBase, db } from './RepositoryBase.js'

// HU-2: técnicos habilitados por categoría (p16). t es la transacción opcional (ver RepositoryBase).
const habilitaciones = new RepositoryBase(db.habilitacion)

export const habilitacionesRepository = {
  listar({ tecnicoId } = {}, t) {
    return habilitaciones.listar({ where: tecnicoId ? { tecnicoId } : {}, order: [['id', 'ASC']] }, t)
  },

  async insertar({ id, tecnicoId, categoriaId }, t) {
    await habilitaciones.crear({ id, tecnicoId, categoriaId }, t)
  },

  async eliminar(id, t) {
    await habilitaciones.eliminar({ id }, t)
  },

  // ids del contrato de datos, como 'hab-011'
  nuevoId(t) {
    return habilitaciones.siguienteId('hab', t)
  },
}
