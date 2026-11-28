'use strict'

// HU-2 Catálogo de servicios (mockups p12 y p13): categoría principal; las inactivas no reciben tickets nuevos.
// La base usa utf8mb4_unicode_ci: el nombre único no distingue mayúsculas ni tildes, igual que el frontend.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categorias', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      nombre: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      descripcion: { type: Sequelize.STRING(240), allowNull: false, defaultValue: '' },
      activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      prioridad_por_defecto: { type: Sequelize.ENUM('critica', 'alta', 'media', 'baja'), allowNull: false },
      tiempo_esperado_horas: { type: Sequelize.SMALLINT, allowNull: false },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('categorias')
  },
}
