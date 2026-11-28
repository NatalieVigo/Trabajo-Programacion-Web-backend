'use strict'

// HU-3 (provisional): solo las columnas que leen HU-1 y HU-2 (tickets por categoría, subcategoría y ambiente)
// y las que usa HU-4 en la cola (asunto, prioridad, tiempo esperado y fecha de registro);
// el responsable de HU-3 completa el resto.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets', {
      id: { type: Sequelize.STRING(12), primaryKey: true },
      codigo: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      usuario_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      categoria_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'categorias', key: 'id' },
      },
      subcategoria_id: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: { model: 'subcategorias', key: 'id' },
      },
      ambiente_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'ambientes', key: 'id' },
      },
      asunto: { type: Sequelize.STRING(120), allowNull: false, defaultValue: '' },
      asignado_a: {
        type: Sequelize.STRING(10),
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
      },
      estado: { type: Sequelize.STRING(20), allowNull: false },
      // HU-4 cambia la prioridad desde la cola; al hacerlo fija el tiempo esperado de esa prioridad
      prioridad: { type: Sequelize.ENUM('critica', 'alta', 'media', 'baja'), allowNull: false, defaultValue: 'media' },
      tiempo_esperado_horas: { type: Sequelize.SMALLINT, allowNull: true },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      cerrado_en: { type: Sequelize.DATE, allowNull: true },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tickets')
  },
}
