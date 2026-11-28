'use strict'
const { Model } = require('sequelize')

// HU-5 Atención y cierre: comentarios públicos y notas internas de un ticket (p25).
// HU-4 también agrega la nota interna al asignar o reasignar.
module.exports = (sequelize, DataTypes) => {
  class bitacora extends Model {
    static associate(models) {
      this.belongsTo(models.ticket, { as: 'ticket', foreignKey: 'ticketId' })
      this.belongsTo(models.usuario, { as: 'autor', foreignKey: 'autorId' })
    }
  }
  bitacora.init(
    {
      id: { type: DataTypes.STRING(12), primaryKey: true },
      ticketId: { type: DataTypes.STRING(12), allowNull: false },
      autorId: { type: DataTypes.STRING(10), allowNull: false },
      tipo: { type: DataTypes.ENUM('publico', 'interno'), allowNull: false },
      mensaje: { type: DataTypes.TEXT, allowNull: false },
      creadoEn: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'bitacora', tableName: 'bitacora' },
  )
  return bitacora
}
