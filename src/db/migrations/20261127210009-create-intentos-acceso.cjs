'use strict'

// HU-1: fallos de ingreso con correos sin cuenta (p05).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('intentos_acceso', {
      correo: { type: Sequelize.STRING(120), primaryKey: true },
      intentos_fallidos: { type: Sequelize.INTEGER, allowNull: false },
      bloqueado_hasta: { type: Sequelize.DATE, allowNull: true },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('intentos_acceso')
  },
}
