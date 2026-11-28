'use strict'
const { Model } = require('sequelize')

// HU-7 Métricas y usuarios: lista de vínculos con la universidad. HU-1 la lee en el registro (p06).
module.exports = (sequelize, DataTypes) => {
  class vinculo extends Model {
    static associate(models) {
      this.hasMany(models.usuario, { as: 'usuarios', foreignKey: 'vinculo', sourceKey: 'nombre' })
    }
  }
  vinculo.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    },
    { sequelize, modelName: 'vinculo', tableName: 'vinculos' },
  )
  return vinculo
}
