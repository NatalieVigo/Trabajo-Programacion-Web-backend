'use strict'

// HU-2: sedes del campus (p14).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sedes', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      nombre: { type: Sequelize.STRING(60), allowNull: false, unique: true },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('sedes')
  },
}
