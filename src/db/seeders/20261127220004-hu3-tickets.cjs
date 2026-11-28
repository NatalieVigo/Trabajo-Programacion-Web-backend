'use strict'

// HU-3: tickets del seed de la entrega 1.
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
        asunto: ticket.asunto ?? '',
        descripcion: ticket.descripcion ?? '',
        asignado_a: ticket.asignadoA,
        estado: ticket.estado,
        prioridad: ticket.prioridad ?? 'media',
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
