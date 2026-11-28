'use strict'

// HU-6 (provisional): encuestas del seed de la entrega 1, solo las columnas que lee HU-1.
const seed = require('../data/seed.json')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'encuestas',
      seed.encuestas.map(({ id, ticketId, usuarioId }) => ({ id, ticket_id: ticketId, usuario_id: usuarioId })),
    )
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('encuestas', null, {})
  },
}
