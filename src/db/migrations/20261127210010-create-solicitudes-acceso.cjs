'use strict'

// HU-1: pedidos de acceso desde la vista 403 (p11).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('solicitudes_acceso', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      usuario_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      recurso: { type: Sequelize.STRING(120), allowNull: false },
      creada_en: { type: Sequelize.DATE, allowNull: false },
    })
    // una persona no puede pedir dos veces la misma sección
    await queryInterface.addIndex('solicitudes_acceso', ['usuario_id', 'recurso'], {
      unique: true,
      name: 'uq_solicitudes_usuario_recurso',
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('solicitudes_acceso')
  },
}
