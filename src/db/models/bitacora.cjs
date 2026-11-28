'use strict'
const { Model } = require('sequelize')

// HU-5 Atención y cierre (provisional): solo los campos que escribe HU-4 (nota interna al asignar);
// el responsable de HU-5 completa el resto.
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
