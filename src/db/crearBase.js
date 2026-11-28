// npm run db:create: crea la base del .env con sequelize-cli. MySQL necesita el juego de caracteres de los textos con
// tildes; PostgreSQL ya usa UTF-8.
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import config from './config/database.js'

const SEQUELIZE_CLI = createRequire(import.meta.url).resolve('sequelize-cli/lib/sequelize')

const OPCIONES_DE_CREACION = Object.freeze({
  mysql: ['--charset', 'utf8mb4', '--collate', 'utf8mb4_unicode_ci'],
  postgres: [],
})

const ambiente = process.env.NODE_ENV || 'development'
const { dialect } = config[ambiente]

execFileSync(process.execPath, [SEQUELIZE_CLI, 'db:create', ...OPCIONES_DE_CREACION[dialect], '--options-path', '.sequelizerc.cjs'], {
  stdio: 'inherit',
})
