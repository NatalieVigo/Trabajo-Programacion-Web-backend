'use strict'

// HU-2 (provisional): solo las columnas que lee HU-1; el responsable de HU-2 completa el resto.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categorias', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      nombre: { type: Sequelize.STRING(60), allowNull: false },
      activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('categorias')
  },
}
