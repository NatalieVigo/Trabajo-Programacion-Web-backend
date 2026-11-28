'use strict'
const { Model } = require('sequelize')

// HU-4 Cola y asignación: un evento del historial del ticket (estado, asignación o prioridad).
module.exports = (sequelize, DataTypes) => {
  class historial extends Model {
    static associate(models) {
      this.belongsTo(models.ticket, { as: 'ticket', foreignKey: 'ticketId' })
      this.belongsTo(models.usuario, { as: 'asignado', foreignKey: 'asignadoA' })
      this.belongsTo(models.usuario, { as: 'autor', foreignKey: 'autorId' })
    }
  }
  const PRIORIDADES = ['critica', 'alta', 'media', 'baja']
  historial.init(
    {
      id: { type: DataTypes.STRING(12), primaryKey: true },
      ticketId: { type: DataTypes.STRING(12), allowNull: false },
      tipo: { type: DataTypes.ENUM('estado', 'asignacion', 'prioridad'), allowNull: false },
      estado: { type: DataTypes.STRING(20), allowNull: true },
      asignadoA: { type: DataTypes.STRING(10), allowNull: true },
      autorId: { type: DataTypes.STRING(10), allowNull: false },
      motivo: { type: DataTypes.STRING(240), allowNull: true },
      retornoEstimado: { type: DataTypes.DATE, allowNull: true },
      solucion: { type: DataTypes.TEXT, allowNull: true },
      prioridadAnterior: { type: DataTypes.ENUM(...PRIORIDADES), allowNull: true },
      prioridadNueva: { type: DataTypes.ENUM(...PRIORIDADES), allowNull: true },
      creadoEn: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'historial', tableName: 'historial' },
  )
  return historial
}
