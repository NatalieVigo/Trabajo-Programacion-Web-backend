'use strict'

// HU-2: técnicos habilitados por categoría (p16). Va después de las cuentas (HU-1) porque apunta a los técnicos.
const seed = require('../data/seed.json')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'habilitaciones',
      seed.habilitaciones.map(({ id, tecnicoId, categoriaId }) => ({ id, tecnico_id: tecnicoId, categoria_id: categoriaId })),
    )
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('habilitaciones', null, {})
  },
}
