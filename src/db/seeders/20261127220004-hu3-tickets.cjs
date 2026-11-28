'use strict'

// HU-3 (provisional): tickets del seed de la entrega 1, solo las columnas que lee HU-1.
const seed = require('../data/seed.json')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'tickets',
      seed.tickets.map((ticket) => ({
        id: ticket.id,
        codigo: ticket.codigo,
        usuario_id: ticket.usuarioId,
        asignado_a: ticket.asignadoA,
        estado: ticket.estado,
        cerrado_en: ticket.cerradoEn ? new Date(ticket.cerradoEn) : null,
      })),
    )
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('tickets', null, {})
  },
}
