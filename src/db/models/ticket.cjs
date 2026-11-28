'use strict'
const { Model } = require('sequelize')

// HU-3 Registro de tickets.
module.exports = (sequelize, DataTypes) => {
  class ticket extends Model {
    static associate(models) {
      this.belongsTo(models.usuario, { as: 'solicitante', foreignKey: 'usuarioId' })
      this.belongsTo(models.usuario, { as: 'tecnico', foreignKey: 'asignadoA' })
      this.belongsTo(models.categoria, { as: 'categoria', foreignKey: 'categoriaId' })
      this.belongsTo(models.subcategoria, { as: 'subcategoria', foreignKey: 'subcategoriaId' })
      this.belongsTo(models.ambiente, { as: 'ambiente', foreignKey: 'ambienteId' })
      this.hasOne(models.encuesta, { as: 'encuesta', foreignKey: 'ticketId' })
      this.hasMany(models.historial, { as: 'historial', foreignKey: 'ticketId' })
    }
  }
  ticket.init(
    {
      id: { type: DataTypes.STRING(12), primaryKey: true },
      codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      usuarioId: { type: DataTypes.STRING(10), allowNull: false },
      categoriaId: { type: DataTypes.STRING(10), allowNull: false },
      subcategoriaId: { type: DataTypes.STRING(10), allowNull: true },
      ambienteId: { type: DataTypes.STRING(10), allowNull: false },
      asunto: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
      descripcion: { type: DataTypes.STRING(600), allowNull: false, defaultValue: '' },
      asignadoA: { type: DataTypes.STRING(10), allowNull: true },
      estado: { type: DataTypes.STRING(20), allowNull: false },
      prioridad: { type: DataTypes.ENUM('critica', 'alta', 'media', 'baja'), allowNull: false, defaultValue: 'media' },
      tiempoEsperadoHoras: { type: DataTypes.SMALLINT, allowNull: true },
      creadoEn: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      cerradoEn: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'ticket', tableName: 'tickets' },
  )
  return ticket
}
