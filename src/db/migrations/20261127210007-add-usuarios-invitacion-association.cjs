'use strict'

// HU-1: la cuenta de un técnico o supervisor apunta a la invitación con la que se creó.
// Va aparte porque invitaciones también apunta a usuarios (quién invitó).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addConstraint('usuarios', {
      fields: ['invitacion_id'],
      type: 'foreign key',
      name: 'fk_usuarios_invitacion',
      references: { table: 'invitaciones', field: 'id' },
    })
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint('usuarios', 'fk_usuarios_invitacion')
  },
}
