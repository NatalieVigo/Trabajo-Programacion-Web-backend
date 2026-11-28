'use strict'
const { Model } = require('sequelize')

// HU-2: subcategoría de una categoría (p13), con su propia prioridad y tiempo esperado.
module.exports = (sequelize, DataTypes) => {
  class subcategoria extends Model {
    static associate(models) {
      this.belongsTo(models.categoria, { as: 'categoria', foreignKey: 'categoriaId' })
    }
  }
  subcategoria.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      categoriaId: { type: DataTypes.STRING(10), allowNull: false },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      descripcion: { type: DataTypes.STRING(240), allowNull: false, defaultValue: '' },
      activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      prioridadPorDefecto: { type: DataTypes.ENUM('critica', 'alta', 'media', 'baja'), allowNull: false },
      tiempoEsperadoHoras: { type: DataTypes.SMALLINT, allowNull: false },
    },
    { sequelize, modelName: 'subcategoria', tableName: 'subcategorias' },
  )
  return subcategoria
}
