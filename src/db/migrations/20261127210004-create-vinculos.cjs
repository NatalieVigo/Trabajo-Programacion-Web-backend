'use strict'

// HU-7: lista de vínculos con la universidad. HU-1 la lee en el registro (p06).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vinculos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(40), allowNull: false, unique: true },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('vinculos')
  },
}
