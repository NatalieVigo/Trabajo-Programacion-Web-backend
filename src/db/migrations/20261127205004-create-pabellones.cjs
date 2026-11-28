'use strict'

// HU-2: pabellones de cada sede (p14). El nombre no se repite dentro de la misma sede.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pabellones', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      sede_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'sedes', key: 'id' },
      },
      nombre: { type: Sequelize.STRING(30), allowNull: false },
    })
    await queryInterface.addIndex('pabellones', ['sede_id', 'nombre'], { unique: true, name: 'uq_pabellones_nombre' })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('pabellones')
  },
}
