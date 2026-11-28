'use strict'

// HU-1: invitaciones para técnicos y supervisores (p07).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invitaciones', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      token: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      nombres: { type: Sequelize.STRING(60), allowNull: false },
      apellidos: { type: Sequelize.STRING(60), allowNull: false },
      correo: { type: Sequelize.STRING(120), allowNull: false },
      rol: { type: Sequelize.ENUM('tecnico', 'supervisor'), allowNull: false },
      telefono: { type: Sequelize.CHAR(9), allowNull: false },
      invitado_por: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      estado: {
        type: Sequelize.ENUM('pendiente', 'aceptada', 'rechazada', 'revocada'),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      vence_en: { type: Sequelize.DATE, allowNull: false },
      creada_en: { type: Sequelize.DATE, allowNull: false },
      respondida_en: { type: Sequelize.DATE, allowNull: true },
    })
    await queryInterface.addIndex('invitaciones', ['correo'], { name: 'idx_invitaciones_correo' })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('invitaciones')
  },
}
