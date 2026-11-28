'use strict'

// HU-3 (provisional): solo las columnas que lee HU-1; el responsable de HU-3 completa el resto.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets', {
      id: { type: Sequelize.STRING(12), primaryKey: true },
      codigo: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      usuario_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      asignado_a: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
      },
      estado: { type: Sequelize.STRING(20), allowNull: false },
      cerrado_en: { type: Sequelize.DATE, allowNull: true },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tickets')
  },
}
