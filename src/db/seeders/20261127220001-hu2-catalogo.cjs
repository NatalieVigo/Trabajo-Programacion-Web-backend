'use strict'

// HU-2 (provisional): categorías y ambientes del seed de la entrega 1, solo las columnas que lee HU-1.
const seed = require('../data/seed.json')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'categorias',
      seed.categorias.map(({ id, nombre, activa }) => ({ id, nombre, activa })),
    )
    await queryInterface.bulkInsert(
      'ambientes',
      seed.ambientes.map(({ id, codigo, nombre }) => ({ id, codigo, nombre })),
    )
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('ambientes', null, {})
    await queryInterface.bulkDelete('categorias', null, {})
  },
}
