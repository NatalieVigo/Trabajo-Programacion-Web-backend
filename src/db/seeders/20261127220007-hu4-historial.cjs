'use strict'

// HU-4: historial de los tickets del seed de la entrega 1 (estados y asignaciones).
const seed = require('../data/seed.json')

const fecha = (valor) => (valor ? new Date(valor) : null)

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'historial',
      seed.historial.map((evento) => ({
        id: evento.id,
        ticket_id: evento.ticketId,
        tipo: evento.tipo,
        estado: evento.estado ?? null,
        asignado_a: evento.asignadoA ?? null,
        autor_id: evento.autorId,
        motivo: evento.motivo ?? null,
        retorno_estimado: fecha(evento.retornoEstimado),
        solucion: evento.solucion ?? null,
        prioridad_anterior: evento.prioridadAnterior ?? null,
        prioridad_nueva: evento.prioridadNueva ?? null,
        creado_en: fecha(evento.creadoEn),
      })),
    )
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('historial', null, {})
  },
}
