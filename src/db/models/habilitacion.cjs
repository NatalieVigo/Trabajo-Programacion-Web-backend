'use strict'
const { Model } = require('sequelize')

// HU-2: técnico habilitado para atender una categoría (p16).
module.exports = (sequelize, DataTypes) => {
  class habilitacion extends Model {
    static associate(models) {
      this.belongsTo(models.usuario, { as: 'tecnico', foreignKey: 'tecnicoId' })
      this.belongsTo(models.categoria, { as: 'categoria', foreignKey: 'categoriaId' })
    }
  }
  habilitacion.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      tecnicoId: { type: DataTypes.STRING(10), allowNull: false },
      categoriaId: { type: DataTypes.STRING(10), allowNull: false },
    },
    { sequelize, modelName: 'habilitacion', tableName: 'habilitaciones' },
  )
  return habilitacion
}
