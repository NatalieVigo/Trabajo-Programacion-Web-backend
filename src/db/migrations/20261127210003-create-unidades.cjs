'use strict'

// HU-7: lista de unidades. HU-1 la lee en el registro (p06) y en Mi cuenta (p10).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('unidades', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(80), allowNull: false, unique: true },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('unidades')
  },
}
