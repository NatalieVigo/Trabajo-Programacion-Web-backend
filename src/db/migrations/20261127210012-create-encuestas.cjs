'use strict'

// HU-6 (provisional): solo las columnas que lee HU-1; el responsable de HU-6 completa el resto.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('encuestas', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      ticket_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        unique: true,
        references: { model: 'tickets', key: 'id' },
      },
      usuario_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('encuestas')
  },
}
