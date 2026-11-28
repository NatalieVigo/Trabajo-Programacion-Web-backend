'use strict'

// HU-1 Cuenta y acceso. La llave hacia invitaciones se agrega después de crear esa tabla.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      nombres: { type: Sequelize.STRING(60), allowNull: false },
      apellidos: { type: Sequelize.STRING(60), allowNull: false },
      correo: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      telefono: { type: Sequelize.CHAR(9), allowNull: false },
      rol: { type: Sequelize.ENUM('usuario', 'tecnico', 'supervisor'), allowNull: false },
      unidad: {
        type: Sequelize.STRING(80),
        allowNull: false,
        references: { model: 'unidades', key: 'nombre' },
      },
      vinculo: {
        type: Sequelize.STRING(40),
        allowNull: true,
        references: { model: 'vinculos', key: 'nombre' },
      },
      especialidades: { type: Sequelize.JSON, allowNull: false },
      ambiente_habitual_id: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: { model: 'ambientes', key: 'id' },
        onDelete: 'SET NULL',
      },
      estado: { type: Sequelize.ENUM('activo', 'bloqueado'), allowNull: false, defaultValue: 'activo' },
      motivo_bloqueo: { type: Sequelize.STRING(255), allowNull: true },
      password_hash: { type: Sequelize.STRING(100), allowNull: false },
      intentos_fallidos: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      bloqueado_hasta: { type: Sequelize.DATE, allowNull: true },
      acepta_terminos: { type: Sequelize.BOOLEAN, allowNull: false },
      invitacion_id: { type: Sequelize.STRING(10), allowNull: true },
      ultimo_acceso_en: { type: Sequelize.DATE, allowNull: true },
      version_sesion: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      creado_en: { type: Sequelize.DATE, allowNull: false },
      actualizado_en: { type: Sequelize.DATE, allowNull: false },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('usuarios')
  },
}
