'use strict'

// HU-2: categorías, subcategorías, sedes, pabellones y ambientes del seed de la entrega 1.
// Va antes de las cuentas (HU-1), que apuntan a su ambiente habitual.
const seed = require('../data/seed.json')

const comunes = ({ nombre, descripcion, activa, prioridadPorDefecto, tiempoEsperadoHoras }) => ({
  nombre,
  descripcion,
  activa,
  prioridad_por_defecto: prioridadPorDefecto,
  tiempo_esperado_horas: tiempoEsperadoHoras,
})

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'categorias',
      seed.categorias.map((categoria) => ({ id: categoria.id, ...comunes(categoria) })),
    )
    await queryInterface.bulkInsert(
      'subcategorias',
      seed.subcategorias.map((sub) => ({ id: sub.id, categoria_id: sub.categoriaId, ...comunes(sub) })),
    )
    await queryInterface.bulkInsert('sedes', seed.sedes.map(({ id, nombre }) => ({ id, nombre })))
    await queryInterface.bulkInsert(
      'pabellones',
      seed.pabellones.map(({ id, sedeId, nombre }) => ({ id, sede_id: sedeId, nombre })),
    )
    await queryInterface.bulkInsert(
      'ambientes',
      seed.ambientes.map(({ id, codigo, nombre, tipo, pabellonId, piso, capacidad }) => ({
        id,
        codigo,
        nombre,
        tipo,
        pabellon_id: pabellonId,
        piso,
        capacidad,
      })),
    )
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('ambientes', null, {})
    await queryInterface.bulkDelete('pabellones', null, {})
    await queryInterface.bulkDelete('sedes', null, {})
    await queryInterface.bulkDelete('subcategorias', null, {})
    await queryInterface.bulkDelete('categorias', null, {})
  },
}
