import { RepositoryBase, db } from './RepositoryBase.js'

// HU-1: cuentas. t es la transacción opcional (ver RepositoryBase).
class UsuariosRepository extends RepositoryBase {
  constructor() {
    super(db.usuario)
  }

  buscarPorCorreo(correo, t) {
    return this.buscarUno({ where: { correo } }, t)
  }

  async insertar(usuario, t) {
    await this.crear(usuario, t)
  }

  async guardarIntentos(id, { intentosFallidos, bloqueadoHasta }, t) {
    await this.actualizar({ id }, { intentosFallidos, bloqueadoHasta }, t)
  }

  // un ingreso correcto limpia los intentos fallidos
  async registrarAcceso(id, fecha, t) {
    await this.actualizar({ id }, { intentosFallidos: 0, bloqueadoHasta: null, ultimoAccesoEn: fecha }, t)
  }

  async actualizarPerfil(id, perfil, fecha, t) {
    const { nombres, apellidos, telefono, unidad, ambienteHabitualId } = perfil
    await this.actualizar({ id }, { nombres, apellidos, telefono, unidad, ambienteHabitualId, actualizadoEn: fecha }, t)
  }

  async actualizarPassword(id, passwordHash, fecha, t) {
    await this.actualizar({ id }, { passwordHash, actualizadoEn: fecha }, t)
  }

  // los tokens llevan la versión de sesión de su cuenta: al subirla, todos los anteriores dejan de servir
  async cerrarSesiones(id, t) {
    await this.modelo.increment('versionSesion', { where: { id }, ...this.opciones(t) })
  }

  // al restablecer también se quita el bloqueo por intentos (no el del supervisor)
  async restablecerPassword(id, passwordHash, fecha, t) {
    await this.actualizar({ id }, { passwordHash, intentosFallidos: 0, bloqueadoHasta: null, actualizadoEn: fecha }, t)
  }
}

export const usuariosRepository = new UsuariosRepository()
