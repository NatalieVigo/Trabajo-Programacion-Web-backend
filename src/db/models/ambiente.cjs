'use strict'
const { Model } = require('sequelize')

// HU-2 Catálogo de servicios (p14 y p15). HU-1 lo lee para el ambiente habitual de la cuenta (p10).
module.exports = (sequelize, DataTypes) => {
  class ambiente extends Model {
    static associate(models) {
      this.belongsTo(models.pabellon, { as: 'pabellon', foreignKey: 'pabellonId' })
      this.hasMany(models.usuario, { as: 'usuariosHabituales', foreignKey: 'ambienteHabitualId' })
    }
  }
  ambiente.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      codigo: { type: DataTypes.STRING(12), allowNull: false, unique: true },
      nombre: { type: DataTypes.STRING(80), allowNull: false },
      tipo: { type: DataTypes.ENUM('aula', 'laboratorio', 'auditorio', 'oficina', 'biblioteca'), allowNull: false },
      pabellonId: { type: DataTypes.STRING(10), allowNull: false },
      piso: { type: DataTypes.SMALLINT, allowNull: false },
      capacidad: { type: DataTypes.SMALLINT, allowNull: false },
    },
    { sequelize, modelName: 'ambiente', tableName: 'ambientes' },
  )
  return ambiente
}
