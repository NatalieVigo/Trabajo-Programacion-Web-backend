'use strict'

// HU-7: listas de unidades y vínculos (en el seed son listas de nombres; el id sigue el mismo orden).
const seed = require('../data/seed.json')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('unidades', seed.unidades.map((nombre) => ({ nombre })))
    await queryInterface.bulkInsert('vinculos', seed.vinculos.map((nombre) => ({ nombre })))
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('vinculos', null, {})
    await queryInterface.bulkDelete('unidades', null, {})
  },
}
