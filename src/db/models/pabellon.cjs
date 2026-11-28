'use strict'
const { Model } = require('sequelize')

// HU-2: pabellón de una sede (p14).
module.exports = (sequelize, DataTypes) => {
  class pabellon extends Model {
    static associate(models) {
      this.belongsTo(models.sede, { as: 'sede', foreignKey: 'sedeId' })
      this.hasMany(models.ambiente, { as: 'ambientes', foreignKey: 'pabellonId' })
    }
  }
  pabellon.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      sedeId: { type: DataTypes.STRING(10), allowNull: false },
      nombre: { type: DataTypes.STRING(30), allowNull: false },
    },
    { sequelize, modelName: 'pabellon', tableName: 'pabellones' },
  )
  return pabellon
}
