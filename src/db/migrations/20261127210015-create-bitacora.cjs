'use strict'

// HU-5 (provisional): solo las columnas que escribe HU-4 al asignar o reasignar con una nota interna;
// el responsable de HU-5 completa el resto.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bitacora', {
      id: { type: Sequelize.STRING(12), primaryKey: true },
      ticket_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
        onDelete: 'CASCADE',
      },
      autor_id: { type: Sequelize.STRING(10), allowNull: false, references: { model: 'usuarios', key: 'id' } },
      tipo: { type: Sequelize.ENUM('publico', 'interno'), allowNull: false },
      mensaje: { type: Sequelize.TEXT, allowNull: false },
      creado_en: { type: Sequelize.DATE, allowNull: false },
    })
    await queryInterface.addIndex('bitacora', ['ticket_id', 'creado_en'])
  },
  async down(queryInterface) {
    await queryInterface.dropTable('bitacora')
  },
}
