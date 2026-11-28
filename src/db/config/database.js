// Configuración de la base de datos. La leen los modelos (models/index.cjs) y sequelize-cli (migraciones y seeders).
// Las credenciales vienen del .env; el repositorio no las guarda (enunciado §7).
import { existsSync } from 'node:fs'

// sequelize-cli no lee el .env por su cuenta; las variables que ya existen no se reemplazan
if (existsSync('.env')) process.loadEnvFile('.env')

const conexion = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'mesa_ayuda',
  dialect: 'mysql',
  // las fechas se guardan y se leen en UTC
  timezone: '+00:00',
  logging: false,
  define: {
    // las fechas de cada tabla tienen sus propios nombres (creado_en, vence_en...), no createdAt y updatedAt
    timestamps: false,
    // en los modelos los campos van como en el seed (creadoEn) y en MySQL con guion bajo (creado_en)
    underscored: true,
    freezeTableName: true,
  },
}

// el mismo formato que config.cjs del laboratorio; cada ambiente toma sus valores del .env
export default {
  development: conexion,
  test: conexion,
  production: conexion,
}
