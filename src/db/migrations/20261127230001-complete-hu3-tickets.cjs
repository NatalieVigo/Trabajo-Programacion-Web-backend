'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tickets', 'descripcion', {
      type: Sequelize.STRING(600),
      allowNull: false,
      defaultValue: '',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tickets', 'descripcion')
  },
}
