import { beforeEach, describe, expect, it } from 'vitest'
import db from '../src/db/models/index.cjs'
import { CAMILA, JULIO, LUCIA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

// Las pruebas corren en orden sobre la misma base: el bloqueo de Camila se prueba antes que su desbloqueo.

let supervisora
beforeEach(async () => {
  supervisora = conToken(await ingresar(LUCIA))
})

const cuenta = async (id) => db.usuario.findByPk(id, { attributes: ['estado', 'motivoBloqueo'], raw: true })
const bloquear = (id, datos) => api().patch(`/api/usuarios/${id}/bloqueo`).set(supervisora).send(datos)
const desbloquear = (id) => api().patch(`/api/usuarios/${id}/desbloqueo`).set(supervisora)

describe('GET /api/usuarios (p32)', () => {
  it('lista las cuentas sin datos sensibles, con sus tickets y especialidades', async () => {
    const respuesta = await api().get('/api/usuarios').set(supervisora)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toHaveLength(10)
    const julio = respuesta.body.find(({ id }) => id === 'usr-002')
    expect(julio).toMatchObject({
      nombre: 'Julio Paredes Soto',
      rol: 'tecnico',
      especialidad: 'Audiovisuales · Redes y conectividad',
      criticosAsignados: 1,
    })
    expect(respuesta.body.find(({ id }) => id === 'usr-001')).toMatchObject({ ticketsReportados: 12 })
    expect(respuesta.body.find(({ id }) => id === 'usr-004')).toMatchObject({ estado: 'bloqueado' })
    expect(Object.keys(julio)).not.toEqual(expect.arrayContaining(['passwordHash']))
    expect(Object.keys(julio)).not.toEqual(expect.arrayContaining(['intentosFallidos']))
  })

  it('responde 401 sin sesión y 403 a quien no es supervisor', async () => {
    expect((await api().get('/api/usuarios')).status).toBe(401)
    for (const credenciales of [CAMILA, JULIO]) {
      const token = conToken(await ingresar(credenciales))
      expect((await api().get('/api/usuarios').set(token)).status).toBe(403)
    }
  })
})

describe('GET /api/usuarios/:id (p33)', () => {
  it('muestra la ficha con el historial de reportes, del más reciente al más antiguo', async () => {
    const respuesta = await api().get('/api/usuarios/usr-001').set(supervisora)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.cuenta).toMatchObject({ id: 'usr-001', nombre: 'Camila Quispe Ramos', estado: 'activo' })
    expect(respuesta.body.ambienteHabitual).toBe('A-201')
    // el promedio de sus 7 encuestas: 5, 4, 4, 5, 3, 5 y 4
    expect(respuesta.body.resumen).toEqual({ reportados: 12, abiertos: 3, cerrados: 8, satisfaccion: 30 / 7 })
    expect(respuesta.body.reportes[0]).toMatchObject({
      codigo: 'TCK-2026-00147',
      categoria: 'Audiovisuales',
      ambiente: 'A-201',
      prioridad: 'critica',
      estado: 'abierto',
    })
  })

  it('responde 404 si la cuenta no existe', async () => {
    const respuesta = await api().get('/api/usuarios/usr-999').set(supervisora)
    expect(respuesta.status).toBe(404)
    expect(respuesta.body.code).toBe('USER_NOT_FOUND')
  })
})

describe('PATCH /api/usuarios/:id/bloqueo', () => {
  it('exige el motivo, de hasta 240 caracteres', async () => {
    for (const datos of [{}, { motivo: '   ' }, { motivo: 'x'.repeat(241) }]) {
      const respuesta = await bloquear('usr-001', datos)
      expect(respuesta.status).toBe(400)
      expect(respuesta.body.fieldErrors).toHaveProperty('motivo')
    }
    expect(await cuenta('usr-001')).toMatchObject({ estado: 'activo' })
  })

  it('no deja bloquear la propia cuenta ni a un técnico con tickets críticos en curso', async () => {
    const propia = await bloquear('usr-003', { motivo: 'Prueba' })
    expect(propia.status).toBe(409)
    expect(propia.body.code).toBe('SELF_BLOCK')

    const conCriticos = await bloquear('usr-002', { motivo: 'Prueba' })
    expect(conCriticos.status).toBe(409)
    expect(conCriticos.body).toMatchObject({
      code: 'CRITICAL_TICKETS',
      message: 'Esta cuenta tiene 1 ticket crítico abierto. Reasígnalo antes de bloquearla.',
    })
    expect(await cuenta('usr-002')).toMatchObject({ estado: 'activo' })
  })

  it('bloquea con el motivo, cierra las sesiones y la cuenta ya no puede ingresar', async () => {
    const tokenDeCamila = conToken(await ingresar(CAMILA))

    const respuesta = await bloquear('usr-001', { motivo: '  Uso indebido del servicio  ' })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toEqual({ id: 'usr-001', nombre: 'Camila Quispe Ramos' })
    expect(await cuenta('usr-001')).toEqual({ estado: 'bloqueado', motivoBloqueo: 'Uso indebido del servicio' })
    expect((await api().get('/api/cuenta').set(tokenDeCamila)).status).toBe(401)
    const ingreso = await api().post('/api/auth/login').send(CAMILA)
    expect(ingreso.status).toBe(403)
    expect(ingreso.body.code).toBe('ACCOUNT_BLOCKED')
  })

  it('responde 409 si la cuenta ya está bloqueada y 404 si no existe', async () => {
    const otraVez = await bloquear('usr-001', { motivo: 'Otra vez' })
    expect(otraVez.status).toBe(409)
    expect(otraVez.body.code).toBe('ACCOUNT_CHANGED')
    expect((await bloquear('usr-999', { motivo: 'Prueba' })).status).toBe(404)
  })
})

describe('PATCH /api/usuarios/:id/desbloqueo', () => {
  it('desbloquea, borra el motivo y la cuenta vuelve a ingresar', async () => {
    const respuesta = await desbloquear('usr-001')

    expect(respuesta.status).toBe(200)
    expect(await cuenta('usr-001')).toEqual({ estado: 'activo', motivoBloqueo: null })
    expect((await api().post('/api/auth/login').send(CAMILA)).status).toBe(200)
  })

  it('responde 409 si la cuenta no está bloqueada y 403 a un técnico', async () => {
    const respuesta = await desbloquear('usr-001')
    expect(respuesta.status).toBe(409)
    expect(respuesta.body.code).toBe('ACCOUNT_CHANGED')

    const tecnico = conToken(await ingresar(JULIO))
    expect((await api().patch('/api/usuarios/usr-004/desbloqueo').set(tecnico)).status).toBe(403)
  })
})
