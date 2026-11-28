import { beforeEach, describe, expect, it } from 'vitest'
import { reiniciarBase } from '../database/reiniciarBase.js'
import { config } from '../src/config.js'
import { pool } from '../src/db/pool.js'
import { CAMILA, JULIO, LUCIA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

let supervisora
let tecnico
beforeEach(async () => {
  // cada prueba parte de la base recién cargada, porque las acciones cambian tickets
  await reiniciarBase(config.db)
  supervisora = conToken(await ingresar(LUCIA))
  tecnico = conToken(await ingresar(JULIO))
})

async function ticket(id) {
  const [[fila]] = await pool.query('SELECT asignado_a, estado, prioridad, tiempo_esperado_horas FROM tickets WHERE id = ?', [id])
  return fila
}

async function eventos(ticketId) {
  const [filas] = await pool.query('SELECT tipo, estado, asignado_a, motivo FROM historial WHERE ticket_id = ? ORDER BY id', [
    ticketId,
  ])
  return filas
}

describe('GET /api/cola (p22)', () => {
  it('lista los tickets en cola con técnicos, categorías y ambientes', async () => {
    const respuesta = await api().get('/api/cola').set(supervisora)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.tickets.map(({ codigo }) => codigo)).toContain('TCK-2026-00147')
    expect(respuesta.body.tickets.every(({ estado }) => estado !== 'cerrado')).toBe(true)
    const julio = respuesta.body.tecnicos.find(({ id }) => id === 'usr-002')
    expect(julio).toMatchObject({ nombre: 'Julio Paredes Soto', habilitadas: ['cat-01', 'cat-02', 'cat-07'] })
  })

  it('responde 403 a un usuario y 401 sin sesión', async () => {
    const camila = conToken(await ingresar(CAMILA))
    expect((await api().get('/api/cola').set(camila)).status).toBe(403)
    expect((await api().get('/api/cola')).status).toBe(401)
  })
})

describe('POST /api/cola/asignaciones (p23)', () => {
  it('asigna, guarda el historial y la nota interna', async () => {
    const respuesta = await api()
      .post('/api/cola/asignaciones')
      .set(supervisora)
      .send({ ids: ['tck-00147'], tecnicoId: 'usr-008', nota: 'Hay clase de 10 a 13' })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toEqual({ actualizados: 1 })
    expect((await ticket('tck-00147')).asignado_a).toBe('usr-008')
    expect(await eventos('tck-00147')).toContainEqual({ tipo: 'asignacion', estado: null, asignado_a: 'usr-008', motivo: null })
    const [[nota]] = await pool.query("SELECT tipo, mensaje FROM bitacora WHERE ticket_id = 'tck-00147' ORDER BY id DESC LIMIT 1")
    expect(nota).toEqual({ tipo: 'interno', mensaje: 'Hay clase de 10 a 13' })
  })

  it('rechaza un técnico no habilitado para la categoría', async () => {
    const respuesta = await api()
      .post('/api/cola/asignaciones')
      .set(supervisora)
      .send({ ids: ['tck-00147'], tecnicoId: 'usr-009', nota: '' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors.tecnico).toMatch(/no está habilitado/)
    expect((await ticket('tck-00147')).asignado_a).toBeNull()
  })

  it('pide un motivo de al menos 10 caracteres para reasignar', async () => {
    const asignar = (nota) =>
      api().post('/api/cola/asignaciones').set(supervisora).send({ ids: ['tck-00144'], tecnicoId: 'usr-010', nota })

    expect((await asignar('corto')).status).toBe(400)
    expect((await asignar('Julio tiene muchos críticos')).status).toBe(200)
    expect((await ticket('tck-00144')).asignado_a).toBe('usr-010')
  })

  it('en lote es todo o nada', async () => {
    // tck-00146 es de cat-04, en la que Marco no está habilitado
    const respuesta = await api()
      .post('/api/cola/asignaciones')
      .set(supervisora)
      .send({ ids: ['tck-00147', 'tck-00146'], tecnicoId: 'usr-008', nota: '' })

    expect(respuesta.status).toBe(400)
    expect((await ticket('tck-00147')).asignado_a).toBeNull()
  })
})

describe('PATCH /api/cola/prioridad (p23)', () => {
  it('cambia la prioridad con motivo y fija el tiempo esperado', async () => {
    const respuesta = await api()
      .patch('/api/cola/prioridad')
      .set(supervisora)
      .send({ ids: ['tck-00147'], prioridad: 'media', motivo: 'Evento institucional mañana' })

    expect(respuesta.status).toBe(200)
    expect(await ticket('tck-00147')).toMatchObject({ prioridad: 'media', tiempo_esperado_horas: 24 })
  })

  it('valida la prioridad y el motivo', async () => {
    const cambiar = (datos) => api().patch('/api/cola/prioridad').set(supervisora).send({ ids: ['tck-00147'], ...datos })

    expect((await cambiar({ prioridad: 'urgente', motivo: 'Evento institucional' })).body.fieldErrors).toHaveProperty('prioridad')
    expect((await cambiar({ prioridad: 'media', motivo: 'poco' })).body.fieldErrors).toHaveProperty('motivo')
    expect((await cambiar({ prioridad: 'critica', motivo: 'Ya es crítica de antes' })).status).toBe(400)
  })
})

describe('POST /api/cola/devoluciones (p23)', () => {
  it('devuelve el ticket a la cola, abierto y sin técnico', async () => {
    const respuesta = await api().post('/api/cola/devoluciones').set(supervisora).send({ ids: ['tck-00144'] })

    expect(respuesta.status).toBe(200)
    expect(await ticket('tck-00144')).toMatchObject({ asignado_a: null, estado: 'abierto' })
    expect((await eventos('tck-00144')).slice(-2)).toEqual([
      { tipo: 'asignacion', estado: null, asignado_a: null, motivo: null },
      { tipo: 'estado', estado: 'abierto', asignado_a: null, motivo: null },
    ])
  })

  it('responde 409 si un ticket no tiene técnico y 404 si no existe', async () => {
    expect((await api().post('/api/cola/devoluciones').set(supervisora).send({ ids: ['tck-00147'] })).status).toBe(409)
    expect((await api().post('/api/cola/devoluciones').set(supervisora).send({ ids: ['tck-99999'] })).status).toBe(404)
  })
})

describe('Bandeja y autoasignación del técnico (p24)', () => {
  it('muestra la bandeja del técnico', async () => {
    const respuesta = await api().get('/api/cola/bandeja').set(tecnico)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.tecnico.nombre).toBe('Julio Paredes Soto')
    expect(respuesta.body.tickets.every(({ tecnicoId }) => tecnicoId === 'usr-002')).toBe(true)
    expect(respuesta.body.disponibles.map(({ id }) => id)).toContain('tck-00147')
  })

  it('se autoasigna solo tickets libres de sus categorías', async () => {
    expect((await api().post('/api/cola/tck-00147/autoasignacion').set(tecnico)).status).toBe(200)
    expect((await ticket('tck-00147')).asignado_a).toBe('usr-002')
    expect((await api().post('/api/cola/tck-00147/autoasignacion').set(tecnico)).status).toBe(409)
    expect((await api().post('/api/cola/tck-00146/autoasignacion').set(tecnico)).status).toBe(403)
  })

  it('el supervisor no tiene bandeja de técnico', async () => {
    expect((await api().get('/api/cola/bandeja').set(supervisora)).status).toBe(403)
  })
})
