'use strict'

// HU-6: encuestas del seed de la entrega 1.
const seed = require('../data/seed.json')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'encuestas',
      seed.encuestas.map((encuesta) => ({
        id: encuesta.id,
        ticket_id: encuesta.ticketId,
        usuario_id: encuesta.usuarioId,
        puntaje: encuesta.puntaje,
        rapidez: encuesta.rapidez,
        trato: encuesta.trato,
        solucion: encuesta.solucion,
        comentario: encuesta.comentario ?? '',
        respondida_en: new Date(encuesta.respondidaEn),
        editada_en: null,
      })),
    )
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('encuestas', null, {})
  },
}
