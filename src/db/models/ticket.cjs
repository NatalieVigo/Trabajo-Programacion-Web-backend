'use strict'
const { Model } = require('sequelize')

// HU-3 Registro de tickets. Por ahora solo los campos que lee HU-1 (resumen de Mi cuenta y contadores); el
// responsable de HU-3 completa el resto.
module.exports = (sequelize, DataTypes) => {
  class ticket extends Model {
    static associate(models) {
      this.belongsTo(models.usuario, { as: 'solicitante', foreignKey: 'usuarioId' })
      this.belongsTo(models.usuario, { as: 'tecnico', foreignKey: 'asignadoA' })
      this.hasOne(models.encuesta, { as: 'encuesta', foreignKey: 'ticketId' })
    }
  }
  ticket.init(
    {
      id: { type: DataTypes.STRING(12), primaryKey: true },
      codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      usuarioId: { type: DataTypes.STRING(10), allowNull: false },
      asignadoA: { type: DataTypes.STRING(10), allowNull: true },
      estado: { type: DataTypes.STRING(20), allowNull: false },
      cerradoEn: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'ticket', tableName: 'tickets' },
  )
  return ticket
}
