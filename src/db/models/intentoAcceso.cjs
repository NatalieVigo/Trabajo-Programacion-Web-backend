'use strict'
const { Model } = require('sequelize')

// HU-1: fallos de ingreso con correos sin cuenta (p05). Se bloquean igual para no revelar qué correos están registrados.
module.exports = (sequelize, DataTypes) => {
  class intentoAcceso extends Model {}
  intentoAcceso.init(
    {
      correo: { type: DataTypes.STRING(120), primaryKey: true },
      intentosFallidos: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      bloqueadoHasta: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'intentoAcceso', tableName: 'intentos_acceso' },
  )
  return intentoAcceso
}
