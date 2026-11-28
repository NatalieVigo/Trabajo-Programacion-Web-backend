'use strict'

// HU-6 Encuesta de satisfacción: una por ticket cerrado, con el puntaje general, los aspectos y el comentario.
// HU-1 lee las encuestas para mostrar las pendientes y HU-7 sus puntajes para la satisfacción por técnico.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const puntaje = () => ({ type: Sequelize.SMALLINT, allowNull: false })
    await queryInterface.createTable('encuestas', {
      id: { type: Sequelize.STRING(10), primaryKey: true },
      ticket_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        unique: true,
        references: { model: 'tickets', key: 'id' },
      },
      usuario_id: {
        type: Sequelize.STRING(10),
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      puntaje: puntaje(),
      rapidez: puntaje(),
      trato: puntaje(),
      solucion: puntaje(),
      comentario: { type: Sequelize.STRING(500), allowNull: false, defaultValue: '' },
      respondida_en: { type: Sequelize.DATE, allowNull: false },
      editada_en: { type: Sequelize.DATE, allowNull: true },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('encuestas')
  },
}
