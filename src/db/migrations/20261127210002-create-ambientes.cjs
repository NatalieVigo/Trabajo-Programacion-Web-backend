'use strict'

// HU-2 (provisional): solo las columnas que lee HU-1; el responsable de HU-2 completa el resto.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ambientes', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      codigo: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(80), allowNull: false },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ambientes')
  },
}
