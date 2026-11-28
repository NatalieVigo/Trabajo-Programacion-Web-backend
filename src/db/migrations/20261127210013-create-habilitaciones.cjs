'use strict'

// HU-2: técnicos habilitados por categoría (p16). Va después de usuarios (HU-1) porque apunta al técnico.
// Si se elimina la categoría o la cuenta, sus habilitaciones se van con ella.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('habilitaciones', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      tecnico_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      categoria_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'categorias', key: 'id' },
        onDelete: 'CASCADE',
      },
    })
    await queryInterface.addIndex('habilitaciones', ['tecnico_id', 'categoria_id'], {
      unique: true,
      name: 'uq_habilitaciones_tecnico_categoria',
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('habilitaciones')
  },
}
