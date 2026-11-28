'use strict'

// HU-2: subcategorías (p13). El nombre se puede repetir, pero no dentro de la misma categoría.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subcategorias', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      categoria_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'categorias', key: 'id' },
      },
      nombre: { type: Sequelize.STRING(60), allowNull: false },
      descripcion: { type: Sequelize.STRING(240), allowNull: false, defaultValue: '' },
      activa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      prioridad_por_defecto: { type: Sequelize.ENUM('critica', 'alta', 'media', 'baja'), allowNull: false },
      tiempo_esperado_horas: { type: Sequelize.SMALLINT, allowNull: false },
    })
    await queryInterface.addIndex('subcategorias', ['categoria_id', 'nombre'], {
      unique: true,
      name: 'uq_subcategorias_nombre',
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('subcategorias')
  },
}
