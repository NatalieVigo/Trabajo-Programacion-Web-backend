import { RepositoryBase, db } from './RepositoryBase.js'

// HU-1: se llenan desde la vista 403 (p11).
class SolicitudesAccesoRepository extends RepositoryBase {
  constructor() {
    super(db.solicitudAcceso)
  }

  existe(usuarioId, recurso, t) {
    return super.existe({ usuarioId, recurso }, t)
  }

  insertar({ usuarioId, recurso, creadaEn }, t) {
    return this.crear({ usuarioId, recurso, creadaEn }, t)
  }
}

export const solicitudesAccesoRepository = new SolicitudesAccesoRepository()
