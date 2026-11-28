'use strict'
const { Model } = require('sequelize')

// HU-1: alta de técnicos y supervisores por invitación (p07). 'vencida' no se guarda: se calcula con venceEn.
module.exports = (sequelize, DataTypes) => {
  class invitacion extends Model {
    static associate(models) {
      this.belongsTo(models.usuario, { as: 'invitador', foreignKey: 'invitadoPor' })
      this.hasOne(models.usuario, { as: 'cuentaCreada', foreignKey: 'invitacionId' })
    }
  }
  invitacion.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      token: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      nombres: { type: DataTypes.STRING(60), allowNull: false },
      apellidos: { type: DataTypes.STRING(60), allowNull: false },
      correo: { type: DataTypes.STRING(120), allowNull: false },
      rol: { type: DataTypes.ENUM('tecnico', 'supervisor'), allowNull: false },
      telefono: { type: DataTypes.CHAR(9), allowNull: false },
      invitadoPor: { type: DataTypes.STRING(10), allowNull: false },
      estado: {
        type: DataTypes.ENUM('pendiente', 'aceptada', 'rechazada', 'revocada'),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      venceEn: { type: DataTypes.DATE, allowNull: false },
      creadaEn: { type: DataTypes.DATE, allowNull: false },
      respondidaEn: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'invitacion', tableName: 'invitaciones' },
  )
  return invitacion
}
