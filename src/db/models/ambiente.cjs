'use strict'
const { Model } = require('sequelize')

// HU-2 Catálogo de servicios. Por ahora solo los campos que lee HU-1 (ambiente habitual en Mi cuenta, p10); el
// responsable de HU-2 completa el resto.
module.exports = (sequelize, DataTypes) => {
  class ambiente extends Model {
    static associate(models) {
      this.hasMany(models.usuario, { as: 'usuariosHabituales', foreignKey: 'ambienteHabitualId' })
    }
  }
  ambiente.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      nombre: { type: DataTypes.STRING(80), allowNull: false },
    },
    { sequelize, modelName: 'ambiente', tableName: 'ambientes' },
  )
  return ambiente
}
