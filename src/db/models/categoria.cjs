'use strict'
const { Model } = require('sequelize')

// HU-2 Catálogo de servicios (p12 y p13): categoría principal; las inactivas no reciben tickets nuevos.
// HU-1 la lee para las especialidades (p07).
module.exports = (sequelize, DataTypes) => {
  class categoria extends Model {
    static associate(models) {
      this.hasMany(models.subcategoria, { as: 'subcategorias', foreignKey: 'categoriaId' })
      this.hasMany(models.habilitacion, { as: 'habilitaciones', foreignKey: 'categoriaId' })
    }
  }
  categoria.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      descripcion: { type: DataTypes.STRING(240), allowNull: false, defaultValue: '' },
      activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      prioridadPorDefecto: { type: DataTypes.ENUM('critica', 'alta', 'media', 'baja'), allowNull: false },
      tiempoEsperadoHoras: { type: DataTypes.SMALLINT, allowNull: false },
    },
    { sequelize, modelName: 'categoria', tableName: 'categorias' },
  )
  return categoria
}
