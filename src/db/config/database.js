// Configuración de la base de datos. La leen los modelos (models/index.cjs) y sequelize-cli (migraciones y seeders).
// Las credenciales vienen del .env; el repositorio no las guarda (enunciado §7).
import { existsSync } from 'node:fs'

// sequelize-cli no lee el .env por su cuenta; las variables que ya existen no se reemplazan
if (existsSync('.env')) process.loadEnvFile('.env')

const PUERTOS = Object.freeze({ mysql: 3306, postgres: 5432 })

// El despliegue usa DATABASE_URL, la cadena de conexión que da Neon (postgresql://usuario:clave@host/base?sslmode=require).
// En local se usan las variables DB_*, con MySQL de XAMPP salvo que DB_DIALECT diga postgres.
function datosDeConexion() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL)
    const dialecto = url.protocol.startsWith('postgres') ? 'postgres' : 'mysql'
    return {
      dialect: dialecto,
      host: url.hostname,
      port: Number(url.port || PUERTOS[dialecto]),
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      ssl: url.searchParams.get('sslmode') === 'require' || process.env.DB_SSL === 'true',
    }
  }
  const dialecto = process.env.DB_DIALECT === 'postgres' ? 'postgres' : 'mysql'
  return {
    dialect: dialecto,
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? PUERTOS[dialecto]),
    username: process.env.DB_USER ?? (dialecto === 'postgres' ? 'postgres' : 'root'),
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'mesa_ayuda',
    ssl: process.env.DB_SSL === 'true',
  }
}

const { ssl, ...datos } = datosDeConexion()

const conexion = {
  ...datos,
  // Neon solo acepta conexiones cifradas; el certificado se valida con las autoridades de Node
  ...(ssl ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: true } } } : {}),
  // las fechas se guardan y se leen en UTC
  timezone: '+00:00',
  logging: false,
  define: {
    // las fechas de cada tabla tienen sus propios nombres (creado_en, vence_en...), no createdAt y updatedAt
    timestamps: false,
    // en los modelos los campos van como en el seed (creadoEn) y en la base con guion bajo (creado_en)
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
