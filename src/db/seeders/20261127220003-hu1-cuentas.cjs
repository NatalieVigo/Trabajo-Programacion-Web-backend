'use strict'

// HU-1: usuarios e invitaciones del seed de la entrega 1.
const { createHash } = require('node:crypto')
const { hashPassword } = require('../../utils/password.js')
const seed = require('../data/seed.json')

// contraseñas de demo; el seed del frontend guarda sha256(sal + contraseña)
const CONTRASENAS_DEMO = {
  'camila.quispe@aloe.ulima.edu.pe': 'Camila2026',
  'jparedes@ulima.edu.pe': 'Tecnico2026',
  'lmendoza@ulima.edu.pe': 'Supervisor2026',
  'diego.salas@aloe.ulima.edu.pe': 'Usuario2026',
}
const CONTRASENA_DEMO_GENERAL = 'Demo2026'

const fecha = (valor) => (valor ? new Date(valor) : null)

// comprueba que la contraseña de demo sea la del seed y la vuelve a cifrar con bcrypt
async function cifrarDesdeSeed({ correo, passwordSalt, passwordHash }) {
  const password = CONTRASENAS_DEMO[correo] ?? CONTRASENA_DEMO_GENERAL
  const delSeed = createHash('sha256').update(passwordSalt + password).digest('hex')
  if (delSeed !== passwordHash) throw new Error(`La contraseña de demo de ${correo} no coincide con el seed.`)
  return hashPassword(password)
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const hashes = await Promise.all(seed.usuarios.map(cifrarDesdeSeed))
    // usuarios e invitaciones se apuntan entre sí: primero las cuentas sin su invitación, luego las invitaciones
    await queryInterface.bulkInsert(
      'usuarios',
      seed.usuarios.map((usuario, i) => ({
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        telefono: usuario.telefono,
        rol: usuario.rol,
        unidad: usuario.unidad,
        vinculo: usuario.vinculo,
        especialidades: JSON.stringify(usuario.especialidades),
        ambiente_habitual_id: usuario.ambienteHabitualId,
        estado: usuario.estado,
        motivo_bloqueo: usuario.motivoBloqueo,
        password_hash: hashes[i],
        intentos_fallidos: usuario.intentosFallidos,
        bloqueado_hasta: fecha(usuario.bloqueadoHasta),
        acepta_terminos: usuario.aceptaTerminos,
        invitacion_id: null,
        creado_en: fecha(usuario.creadoEn),
        actualizado_en: fecha(usuario.actualizadoEn),
      })),
    )
    await queryInterface.bulkInsert(
      'invitaciones',
      seed.invitaciones.map((invitacion) => ({
        id: invitacion.id,
        token: invitacion.token,
        nombres: invitacion.nombres,
        apellidos: invitacion.apellidos,
        correo: invitacion.correo,
        rol: invitacion.rol,
        telefono: invitacion.telefono,
        invitado_por: invitacion.invitadoPor,
        estado: invitacion.estado,
        vence_en: fecha(invitacion.venceEn),
        creada_en: fecha(invitacion.creadaEn),
        respondida_en: fecha(invitacion.respondidaEn),
      })),
    )
    for (const { id, invitacionId } of seed.usuarios.filter((usuario) => usuario.invitacionId)) {
      await queryInterface.bulkUpdate('usuarios', { invitacion_id: invitacionId }, { id })
    }
  },
  async down(queryInterface) {
    await queryInterface.bulkUpdate('usuarios', { invitacion_id: null }, {})
    await queryInterface.bulkDelete('invitaciones', null, {})
    await queryInterface.bulkDelete('usuarios', null, {})
  },
}
