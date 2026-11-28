import { beforeEach, describe, expect, it } from 'vitest'
import db from '../src/db/models/index.cjs'
import { CAMILA, JULIO, LUCIA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

// Las pruebas corren en orden sobre la misma base; cada una usa tickets distintos para no depender de las otras.

let supervisora
let tecnico
beforeEach(async () => {
  supervisora = conToken(await ingresar(LUCIA))
  tecnico = conToken(await ingresar(JULIO))
})

const ticket = async (id) => (await db.ticket.findByPk(id, { raw: true }))
const eventos = (ticketId) =>
  db.historial.findAll({ where: { ticketId }, attributes: ['tipo', 'estado', 'asignadoA', 'motivo'], order: [['id', 'ASC']], raw: true })

describe('GET /api/cola (p22)', () => {
  it('lista los tickets en cola con técnicos, categorías y ambientes', async () => {
    const respuesta = await api().get('/api/cola').set(supervisora)

    expect(respuesta.status).toBe(200)
    const tck147 = respuesta.body.tickets.find(({ id }) => id === 'tck-00147')
    expect(tck147).toMatchObject({ codigo: 'TCK-2026-00147', categoria: 'Audiovisuales', tecnicoId: null, prioridad: 'critica' })
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
    expect((await ticket('tck-00147')).asignadoA).toBe('usr-008')
    expect(await eventos('tck-00147')).toContainEqual({ tipo: 'asignacion', estado: null, asignadoA: 'usr-008', motivo: null })
    const nota = await db.bitacora.findOne({ where: { ticketId: 'tck-00147' }, order: [['id', 'DESC']], raw: true })
    expect(nota).toMatchObject({ tipo: 'interno', mensaje: 'Hay clase de 10 a 13' })
  })

  it('rechaza un técnico no habilitado para la categoría', async () => {
    // tck-00146 es de cat-04, en la que Marco no está habilitado
    const respuesta = await api()
      .post('/api/cola/asignaciones')
      .set(supervisora)
      .send({ ids: ['tck-00146'], tecnicoId: 'usr-008', nota: '' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors.tecnico).toMatch(/no está habilitado/)
    expect((await ticket('tck-00146')).asignadoA).toBeNull()
  })

  it('pide un motivo de al menos 10 caracteres para reasignar', async () => {
    const asignar = (nota) =>
      api().post('/api/cola/asignaciones').set(supervisora).send({ ids: ['tck-00144'], tecnicoId: 'usr-010', nota })

    expect((await asignar('corto')).status).toBe(400)
    expect((await asignar('Julio tiene muchos críticos')).status).toBe(200)
    expect((await ticket('tck-00144')).asignadoA).toBe('usr-010')
  })

  it('en lote es todo o nada', async () => {
    // Iván atiende cat-04 (tck-00146) pero no cat-01 (tck-00141)
    const respuesta = await api()
      .post('/api/cola/asignaciones')
      .set(supervisora)
      .send({ ids: ['tck-00146', 'tck-00141'], tecnicoId: 'usr-009', nota: 'Revisar los dos hoy' })

    expect(respuesta.status).toBe(400)
    expect((await ticket('tck-00146')).asignadoA).toBeNull()
  })
})

describe('PATCH /api/cola/prioridad (p23)', () => {
  it('cambia la prioridad con motivo y fija el tiempo esperado', async () => {
    const respuesta = await api()
      .patch('/api/cola/prioridad')
      .set(supervisora)
      .send({ ids: ['tck-00146'], prioridad: 'media', motivo: 'Evento institucional mañana' })

    expect(respuesta.status).toBe(200)
    expect(await ticket('tck-00146')).toMatchObject({ prioridad: 'media', tiempoEsperadoHoras: 24 })
    expect((await eventos('tck-00146')).at(-1)).toMatchObject({ tipo: 'prioridad', motivo: 'Evento institucional mañana' })
  })

  it('valida la prioridad y el motivo', async () => {
    const cambiar = (datos) => api().patch('/api/cola/prioridad').set(supervisora).send({ ids: ['tck-00146'], ...datos })

    expect((await cambiar({ prioridad: 'urgente', motivo: 'Evento institucional' })).body.fieldErrors).toHaveProperty('prioridad')
    expect((await cambiar({ prioridad: 'alta', motivo: 'poco' })).body.fieldErrors).toHaveProperty('motivo')
    expect((await cambiar({ prioridad: 'media', motivo: 'Ya tiene esa prioridad' })).status).toBe(400)
  })
})

describe('POST /api/cola/devoluciones (p23)', () => {
  it('devuelve el ticket a la cola, abierto y sin técnico', async () => {
    const respuesta = await api().post('/api/cola/devoluciones').set(supervisora).send({ ids: ['tck-00143'] })

    expect(respuesta.status).toBe(200)
    expect(await ticket('tck-00143')).toMatchObject({ asignadoA: null, estado: 'abierto' })
    expect((await eventos('tck-00143')).slice(-2)).toEqual([
      { tipo: 'asignacion', estado: null, asignadoA: null, motivo: null },
      { tipo: 'estado', estado: 'abierto', asignadoA: null, motivo: null },
    ])
  })

  it('responde 409 si un ticket no tiene técnico y 404 si no existe', async () => {
    expect((await api().post('/api/cola/devoluciones').set(supervisora).send({ ids: ['tck-00146'] })).status).toBe(409)
    expect((await api().post('/api/cola/devoluciones').set(supervisora).send({ ids: ['tck-99999'] })).status).toBe(404)
    expect((await api().post('/api/cola/devoluciones').set(supervisora).send({ ids: [] })).status).toBe(400)
  })
})

describe('Bandeja y autoasignación del técnico (p24)', () => {
  it('muestra la bandeja del técnico con los tickets que puede tomar', async () => {
    const respuesta = await api().get('/api/cola/bandeja').set(tecnico)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.tecnico.nombre).toBe('Julio Paredes Soto')
    expect(respuesta.body.tickets.every(({ tecnicoId }) => tecnicoId === 'usr-002')).toBe(true)
    // tck-00143 volvió a la cola en la prueba anterior y es de Audiovisuales, donde Julio está habilitado
    expect(respuesta.body.disponibles.map(({ id }) => id)).toContain('tck-00143')
  })

  it('se autoasigna solo tickets libres de sus categorías', async () => {
    expect((await api().post('/api/cola/tck-00143/autoasignacion').set(tecnico)).status).toBe(200)
    expect((await ticket('tck-00143')).asignadoA).toBe('usr-002')
    expect((await api().post('/api/cola/tck-00143/autoasignacion').set(tecnico)).status).toBe(409)
    expect((await api().post('/api/cola/tck-00146/autoasignacion').set(tecnico)).status).toBe(403)
  })

  it('el supervisor no tiene bandeja de técnico', async () => {
    expect((await api().get('/api/cola/bandeja').set(supervisora)).status).toBe(403)
  })
})
