'use strict'

// HU-5: la bitácora del seed de la entrega 1 (comentarios públicos y notas internas).
const seed = require('../data/seed.json')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'bitacora',
      seed.bitacora.map((nota) => ({
        id: nota.id,
        ticket_id: nota.ticketId,
        autor_id: nota.autorId,
        tipo: nota.tipo,
        mensaje: nota.mensaje,
        creado_en: new Date(nota.creadoEn),
      })),
    )
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('bitacora', null, {})
  },
}
