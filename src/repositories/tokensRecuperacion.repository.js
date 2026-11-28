import { RepositoryBase, db } from './RepositoryBase.js'

// HU-1: enlaces de recuperación de contraseña (p08 y p09).
class TokensRecuperacionRepository extends RepositoryBase {
  constructor() {
    super(db.tokenRecuperacion)
  }

  // solo vale el último enlace: los anteriores sin usar se borran
  async borrarSinUsar(usuarioId, t) {
    await this.eliminar({ usuarioId, usadoEn: null }, t)
  }

  buscar(token, t, { bloquear = false } = {}) {
    return this.buscarPorId(token, t, { bloquear })
  }

  async marcarUsado(token, fecha, t) {
    await this.actualizar({ token }, { usadoEn: fecha }, t)
  }
}

export const tokensRecuperacionRepository = new TokensRecuperacionRepository()
