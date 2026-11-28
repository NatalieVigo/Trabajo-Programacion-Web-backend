'use strict'
const { Model } = require('sequelize')

// HU-6 Encuesta de satisfacción. Por ahora solo los campos que lee HU-1 (encuesta pendiente); el responsable de HU-6
// completa el resto.
module.exports = (sequelize, DataTypes) => {
  class encuesta extends Model {
    static associate(models) {
      this.belongsTo(models.ticket, { as: 'ticket', foreignKey: 'ticketId' })
      this.belongsTo(models.usuario, { as: 'usuario', foreignKey: 'usuarioId' })
    }
  }
  encuesta.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      ticketId: { type: DataTypes.STRING(12), allowNull: false, unique: true },
      usuarioId: { type: DataTypes.STRING(10), allowNull: false },
    },
    { sequelize, modelName: 'encuesta', tableName: 'encuestas' },
  )
  return encuesta
}
