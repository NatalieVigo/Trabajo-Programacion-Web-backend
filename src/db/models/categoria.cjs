'use strict'
const { Model } = require('sequelize')

// HU-2 Catálogo de servicios. Por ahora solo los campos que lee HU-1 (especialidades en p07); el responsable de HU-2
// completa el resto.
module.exports = (sequelize, DataTypes) => {
  class categoria extends Model {}
  categoria.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { sequelize, modelName: 'categoria', tableName: 'categorias' },
  )
  return categoria
}
