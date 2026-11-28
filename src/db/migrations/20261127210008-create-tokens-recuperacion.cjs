'use strict'

// HU-1: enlaces de recuperación de contraseña (p08 y p09).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tokens_recuperacion', {
      token: { type: Sequelize.CHAR(36), primaryKey: true },
      usuario_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      creado_en: { type: Sequelize.DATE, allowNull: false },
      vence_en: { type: Sequelize.DATE, allowNull: false },
      usado_en: { type: Sequelize.DATE, allowNull: true },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tokens_recuperacion')
  },
}
