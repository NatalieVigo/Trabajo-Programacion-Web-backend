'use strict'
const { Model } = require('sequelize')

// HU-6 Encuesta de satisfacción: una por ticket cerrado. HU-1 la lee para las encuestas pendientes y HU-7 para la
// satisfacción por técnico.
module.exports = (sequelize, DataTypes) => {
  class encuesta extends Model {
    static associate(models) {
      this.belongsTo(models.ticket, { as: 'ticket', foreignKey: 'ticketId' })
      this.belongsTo(models.usuario, { as: 'usuario', foreignKey: 'usuarioId' })
    }
  }
  // un objeto por campo: Sequelize le agrega a cada uno el nombre de su columna
  const puntaje = () => ({ type: DataTypes.SMALLINT, allowNull: false })
  encuesta.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      ticketId: { type: DataTypes.STRING(12), allowNull: false, unique: true },
      usuarioId: { type: DataTypes.STRING(10), allowNull: false },
      // puntaje general del 1 al 5
      puntaje: puntaje(),
      rapidez: puntaje(),
      trato: puntaje(),
      solucion: puntaje(),
      comentario: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
      respondidaEn: { type: DataTypes.DATE, allowNull: false },
      editadaEn: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'encuesta', tableName: 'encuestas' },
  )
  return encuesta
}
