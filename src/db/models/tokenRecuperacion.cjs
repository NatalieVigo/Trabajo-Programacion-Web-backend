'use strict'
const { Model } = require('sequelize')

// HU-1: enlaces de recuperación de contraseña (p08 y p09). Duran 30 minutos y sirven una sola vez.
module.exports = (sequelize, DataTypes) => {
  class tokenRecuperacion extends Model {
    static associate(models) {
      this.belongsTo(models.usuario, { as: 'usuario', foreignKey: 'usuarioId' })
    }
  }
  tokenRecuperacion.init(
    {
      token: { type: DataTypes.CHAR(36), primaryKey: true },
      usuarioId: { type: DataTypes.STRING(10), allowNull: false },
      creadoEn: { type: DataTypes.DATE, allowNull: false },
      venceEn: { type: DataTypes.DATE, allowNull: false },
      usadoEn: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'tokenRecuperacion', tableName: 'tokens_recuperacion' },
  )
  return tokenRecuperacion
}
