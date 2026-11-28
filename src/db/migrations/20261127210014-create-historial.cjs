'use strict'

// HU-4 Cola y asignación: historial del ticket (p22 a p24 y p27). Una fila por evento: cambio de estado,
// asignación (o devolución a la cola, con asignado_a vacío) y cambio de prioridad.
// HU-3 agrega el registro, la cancelación y la reapertura; HU-5 agrega los cambios de estado.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const PRIORIDADES = ['critica', 'alta', 'media', 'baja']
    await queryInterface.createTable('historial', {
      id: { type: Sequelize.STRING(12), primaryKey: true },
      ticket_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
        onDelete: 'CASCADE',
      },
      tipo: { type: Sequelize.ENUM('estado', 'asignacion', 'prioridad'), allowNull: false },
      // tipo 'estado': el estado al que pasó el ticket
      estado: { type: Sequelize.STRING(20), allowNull: true },
      // tipo 'asignacion': el técnico nuevo; vacío cuando el ticket vuelve a la cola
      asignado_a: { type: Sequelize.STRING(10), allowNull: true, references: { model: 'usuarios', key: 'id' } },
      autor_id: { type: Sequelize.STRING(10), allowNull: false, references: { model: 'usuarios', key: 'id' } },
      // motivo de la reasignación, del cambio de prioridad o de la espera
      motivo: { type: Sequelize.STRING(240), allowNull: true },
      retorno_estimado: { type: Sequelize.DATE, allowNull: true },
      solucion: { type: Sequelize.TEXT, allowNull: true },
      prioridad_anterior: { type: Sequelize.ENUM(...PRIORIDADES), allowNull: true },
      prioridad_nueva: { type: Sequelize.ENUM(...PRIORIDADES), allowNull: true },
      creado_en: { type: Sequelize.DATE, allowNull: false },
    })
    await queryInterface.addIndex('historial', ['ticket_id', 'creado_en'])
  },
  async down(queryInterface) {
    await queryInterface.dropTable('historial')
  },
}
