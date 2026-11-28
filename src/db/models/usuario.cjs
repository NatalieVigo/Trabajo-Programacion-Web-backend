'use strict'
const { Model } = require('sequelize')

// HU-1 Cuenta y acceso (mockups p03 a p11). HU-7 cambia el estado y el motivo del bloqueo.
module.exports = (sequelize, DataTypes) => {
  class usuario extends Model {
    static associate(models) {
      this.belongsTo(models.unidad, { as: 'datosUnidad', foreignKey: 'unidad', targetKey: 'nombre' })
      this.belongsTo(models.vinculo, { as: 'datosVinculo', foreignKey: 'vinculo', targetKey: 'nombre' })
      this.belongsTo(models.ambiente, { as: 'ambienteHabitual', foreignKey: 'ambienteHabitualId' })
      // la invitación con la que se creó la cuenta (técnicos y supervisores, p07)
      this.belongsTo(models.invitacion, { as: 'invitacion', foreignKey: 'invitacionId' })
      this.hasMany(models.invitacion, { as: 'invitacionesEnviadas', foreignKey: 'invitadoPor' })
      this.hasMany(models.tokenRecuperacion, { as: 'tokensRecuperacion', foreignKey: 'usuarioId' })
      this.hasMany(models.solicitudAcceso, { as: 'solicitudesAcceso', foreignKey: 'usuarioId' })
      this.hasMany(models.ticket, { as: 'ticketsReportados', foreignKey: 'usuarioId' })
      this.hasMany(models.ticket, { as: 'ticketsAsignados', foreignKey: 'asignadoA' })
      this.hasMany(models.encuesta, { as: 'encuestas', foreignKey: 'usuarioId' })
    }
  }
  usuario.init(
    {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      nombres: { type: DataTypes.STRING(60), allowNull: false },
      apellidos: { type: DataTypes.STRING(60), allowNull: false },
      correo: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      telefono: { type: DataTypes.CHAR(9), allowNull: false },
      rol: { type: DataTypes.ENUM('usuario', 'tecnico', 'supervisor'), allowNull: false },
      unidad: { type: DataTypes.STRING(80), allowNull: false },
      vinculo: { type: DataTypes.STRING(40), allowNull: true },
      // ids de las categorías que eligió el técnico o supervisor al aceptar la invitación (p07), como en el seed
      especialidades: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        // en MariaDB (XAMPP) la columna JSON llega como texto
        get() {
          const valor = this.getDataValue('especialidades')
          return typeof valor === 'string' ? JSON.parse(valor) : (valor ?? [])
        },
      },
      ambienteHabitualId: { type: DataTypes.STRING(10), allowNull: true },
      estado: { type: DataTypes.ENUM('activo', 'bloqueado'), allowNull: false, defaultValue: 'activo' },
      motivoBloqueo: { type: DataTypes.STRING(255), allowNull: true },
      // cifrada con bcrypt (§7), nunca en texto plano
      passwordHash: { type: DataTypes.STRING(100), allowNull: false },
      intentosFallidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      bloqueadoHasta: { type: DataTypes.DATE, allowNull: true },
      aceptaTerminos: { type: DataTypes.BOOLEAN, allowNull: false },
      invitacionId: { type: DataTypes.STRING(10), allowNull: true },
      ultimoAccesoEn: { type: DataTypes.DATE, allowNull: true },
      // va en cada token de sesión; al subir, los tokens con una versión anterior dejan de servir
      versionSesion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      creadoEn: { type: DataTypes.DATE, allowNull: false },
      actualizadoEn: { type: DataTypes.DATE, allowNull: false },
    },
    { sequelize, modelName: 'usuario', tableName: 'usuarios' },
  )
  return usuario
}
