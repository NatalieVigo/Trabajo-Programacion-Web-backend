'use strict'

// HU-2: ambientes (p14 y p15). El código va en mayúsculas, como A-201 o BIB-P2.
// Va antes de usuarios porque la cuenta guarda su ambiente habitual (HU-1).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ambientes', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      codigo: { type: Sequelize.STRING(12), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(80), allowNull: false },
      tipo: {
        type: Sequelize.ENUM('aula', 'laboratorio', 'auditorio', 'oficina', 'biblioteca'),
        allowNull: false,
      },
      pabellon_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'pabellones', key: 'id' },
      },
      piso: { type: Sequelize.TINYINT, allowNull: false },
      capacidad: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ambientes')
  },
}
