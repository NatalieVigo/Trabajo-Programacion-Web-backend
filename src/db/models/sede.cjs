'use strict'
const { Model } = require('sequelize')

// HU-2: sede del campus (p14).
module.exports = (sequelize, DataTypes) => {
  class sede extends Model {
    static associate(models) {
      this.hasMany(models.pabellon, { as: 'pabellones', foreignKey: 'sedeId' })
    }
  }
  sede.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    },
    { sequelize, modelName: 'sede', tableName: 'sedes' },
  )
  return sede
}
