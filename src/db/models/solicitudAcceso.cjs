'use strict'
const { Model } = require('sequelize')

// HU-1: pedidos de acceso desde la vista 403 (p11). Una persona no puede pedir dos veces la misma sección.
module.exports = (sequelize, DataTypes) => {
  class solicitudAcceso extends Model {
    static associate(models) {
      this.belongsTo(models.usuario, { as: 'usuario', foreignKey: 'usuarioId' })
    }
  }
  solicitudAcceso.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      usuarioId: { type: DataTypes.STRING(10), allowNull: false },
      recurso: { type: DataTypes.STRING(120), allowNull: false },
      creadaEn: { type: DataTypes.DATE, allowNull: false },
    },
    { sequelize, modelName: 'solicitudAcceso', tableName: 'solicitudes_acceso' },
  )
  return solicitudAcceso
}
