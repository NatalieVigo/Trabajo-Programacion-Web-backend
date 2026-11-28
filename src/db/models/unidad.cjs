'use strict'
const { Model } = require('sequelize')

// HU-7 Métricas y usuarios: lista de unidades. HU-1 la lee en el registro (p06) y en Mi cuenta (p10).
module.exports = (sequelize, DataTypes) => {
  class unidad extends Model {
    static associate(models) {
      this.hasMany(models.usuario, { as: 'usuarios', foreignKey: 'unidad', sourceKey: 'nombre' })
    }
  }
  unidad.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    },
    { sequelize, modelName: 'unidad', tableName: 'unidades' },
  )
  return unidad
}
