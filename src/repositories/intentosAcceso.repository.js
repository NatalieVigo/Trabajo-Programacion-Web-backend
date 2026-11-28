import { RepositoryBase, db } from './RepositoryBase.js'

// HU-1: intentos fallidos con correos sin cuenta, una fila por correo.
class IntentosAccesoRepository extends RepositoryBase {
  constructor() {
    super(db.intentoAcceso)
  }

  async buscar(correo, t) {
    const fila = await this.buscarPorId(correo, t)
    return fila && { intentosFallidos: fila.intentosFallidos, bloqueadoHasta: fila.bloqueadoHasta }
  }

  // crea la fila la primera vez y la actualiza las siguientes
  async guardar(correo, { intentosFallidos, bloqueadoHasta }, t) {
    await this.modelo.upsert({ correo, intentosFallidos, bloqueadoHasta }, this.opciones(t))
  }
}

export const intentosAccesoRepository = new IntentosAccesoRepository()
