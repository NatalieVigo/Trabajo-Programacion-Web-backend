import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { app } from '../src/app.js'
import db from '../src/db/models/index.cjs'

const SEQUELIZE_CLI = createRequire(import.meta.url).resolve('sequelize-cli/lib/sequelize')

// lo mismo que npm run db:reset, sobre la base de prueba (DB_NAME de vitest.config.js)
const PASOS_DEL_REINICIO = [
  ['db:drop'],
  ['db:create', '--charset', 'utf8mb4', '--collate', 'utf8mb4_unicode_ci'],
  ['db:migrate'],
  ['db:seed:all'],
]

function reiniciarBase() {
  for (const paso of PASOS_DEL_REINICIO) {
    execFileSync(process.execPath, [SEQUELIZE_CLI, ...paso, '--options-path', '.sequelizerc.cjs'], { stdio: 'pipe' })
  }
}

// mismo reloj que las pruebas del frontend
export const AHORA = '2026-10-01T15:27:00.000Z' // 10:27 en Lima

export const CAMILA = { correo: 'camila.quispe@aloe.ulima.edu.pe', password: 'Camila2026' }
export const JULIO = { correo: 'jparedes@ulima.edu.pe', password: 'Tecnico2026' }
export const LUCIA = { correo: 'lmendoza@ulima.edu.pe', password: 'Supervisor2026' }
export const DIEGO = { correo: 'diego.salas@aloe.ulima.edu.pe', password: 'Usuario2026' }

export const api = () => request(app)

export const conToken = (token) => ({ Authorization: `Bearer ${token}` })

export async function ingresar(credenciales) {
  const respuesta = await api().post('/api/auth/login').send(credenciales)
  return respuesta.body.token
}

// cada archivo empieza con la base de prueba recién creada con las migraciones y cargada con los seeders
export function usarBaseDePrueba() {
  beforeAll(() => reiniciarBase())
  afterAll(() => db.sequelize.close())

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AHORA)
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}
