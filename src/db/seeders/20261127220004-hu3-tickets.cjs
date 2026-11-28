'use strict'

// HU-3 (provisional): tickets del seed de la entrega 1, solo las columnas que leen HU-1, HU-2 y HU-4.
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
        categoria_id: ticket.categoriaId,
        subcategoria_id: ticket.subcategoriaId ?? null,
        ambiente_id: ticket.ambienteId,
        asunto: ticket.asunto,
        asignado_a: ticket.asignadoA,
        estado: ticket.estado,
        prioridad: ticket.prioridad,
        tiempo_esperado_horas: ticket.tiempoEsperadoHoras ?? null,
        creado_en: new Date(ticket.creadoEn),
        cerrado_en: ticket.cerradoEn ? new Date(ticket.cerradoEn) : null,
      })),
    )
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('tickets', null, {})
  },
}
