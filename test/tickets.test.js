import { beforeEach, describe, expect, it } from 'vitest'
import db from '../src/db/models/index.cjs'
import { CAMILA, JULIO, api, ingresar, usarBaseDePrueba } from './ayuda.js'
import { conSesion, restaurarCatalogo } from './ayudaCatalogo.js'

usarBaseDePrueba()

let camila
beforeEach(async () => {
  await db.historial.destroy({ where: {} })
  await restaurarCatalogo()
  camila = conSesion(await ingresar(CAMILA))
})

const nuevoTicket = {
  categoriaId: 'cat-03',
  subcategoriaId: 'sub-08',
  ambienteId: 'amb-01',
  asunto: '  Aire acondicionado no enfría  ',
  descripcion: '  El equipo está encendido, pero el ambiente sigue caliente.  ',
}

describe('HU-3 Registro de tickets', () => {
  it('registra un ticket con prioridad y plazo de la subcategoría', async () => {
    const respuesta = await camila.post('/api/tickets', nuevoTicket)

    expect(respuesta.status).toBe(201)
    expect(respuesta.body).toMatchObject({
      codigo: expect.stringMatching(/^TCK-2026-/),
      usuarioId: 'usr-001',
      categoriaId: 'cat-03',
      subcategoriaId: 'sub-08',
      ambienteId: 'amb-01',
      asunto: 'Aire acondicionado no enfría',
      descripcion: 'El equipo está encendido, pero el ambiente sigue caliente.',
      prioridad: 'alta',
      tiempoEsperadoHoras: 8,
      estado: 'abierto',
      asignadoA: null,
      cerradoEn: null,
    })
    expect(respuesta.body.id).toMatch(/^tck-\d{5}$/)
  })

  it('lista únicamente los tickets de la cuenta autenticada con sus datos de catálogo', async () => {
    await camila.post('/api/tickets', nuevoTicket)

    const respuesta = await camila.get('/api/tickets')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.length).toBeGreaterThan(0)
    expect(respuesta.body.every(({ usuarioId }) => usuarioId === 'usr-001')).toBe(true)
    expect(respuesta.body[0]).toMatchObject({
      asunto: 'Aire acondicionado no enfría',
      categoria: { id: 'cat-03', nombre: 'Climatización' },
      subcategoria: { id: 'sub-08', nombre: 'Aire sin frío' },
      ambiente: { id: 'amb-01' },
    })
  })

  it('avisa de un ticket propio duplicado sin impedir otro registro', async () => {
    const creado = await camila.post('/api/tickets', nuevoTicket)

    const repetido = await camila.get('/api/tickets/duplicados?categoriaId=cat-03&ambienteId=amb-01')

    expect(repetido.status).toBe(200)
    expect(repetido.body).toEqual({
      propio: true,
      codigo: creado.body.codigo,
      creadoEn: creado.body.creadoEn,
    })
    expect((await camila.post('/api/tickets', nuevoTicket)).status).toBe(201)
  })

  it('registra el evento inicial y cancela el ticket propio con evento atómico', async () => {
    const creado = await camila.post('/api/tickets', nuevoTicket)
    const respuesta = await camila.patch(`/api/tickets/${creado.body.codigo}/cancelacion`)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toMatchObject({ id: creado.body.id, estado: 'cancelado', cerradoEn: null })
    const eventos = await db.historial.findAll({
      where: { ticketId: creado.body.id },
      order: [['creadoEn', 'ASC']],
    })
    expect(eventos.map(({ tipo, estado, autorId }) => ({ tipo, estado, autorId }))).toEqual([
      { tipo: 'estado', estado: 'abierto', autorId: 'usr-001' },
      { tipo: 'estado', estado: 'cancelado', autorId: 'usr-001' },
    ])
  })

  it('reabre dentro del plazo y registra el motivo en el historial', async () => {
    await db.ticket.update(
      { cerradoEn: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { where: { id: 'tck-00103' } },
    )
    const respuesta = await camila.patch('/api/tickets/TCK-2026-00103/reapertura', {
      motivo: 'La falla volvió a presentarse.',
    })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toMatchObject({ id: 'tck-00103', estado: 'reabierto', cerradoEn: null })
    const evento = await db.historial.findOne({
      where: { ticketId: 'tck-00103', estado: 'reabierto' },
    })
    expect(evento).toMatchObject({
      tipo: 'estado',
      estado: 'reabierto',
      autorId: 'usr-001',
      motivo: 'La falla volvió a presentarse.',
    })
  })

  it('rechaza cancelar tickets asignados y reabrir fuera del plazo', async () => {
    const creado = await camila.post('/api/tickets', nuevoTicket)
    await db.ticket.update({ asignadoA: 'usr-002' }, { where: { id: creado.body.id } })
    const asignado = await camila.patch(`/api/tickets/${creado.body.codigo}/cancelacion`)
    expect(asignado.status).toBe(409)
    expect(asignado.body.code).toBe('TICKET_NOT_CANCELLABLE')

    const vencido = await camila.patch('/api/tickets/TCK-2026-00103/reapertura', {
      motivo: 'La falla volvió a presentarse.',
    })
    expect(vencido.status).toBe(409)
    expect(vencido.body.code).toBe('REOPEN_PERIOD_EXPIRED')
  })

  it('valida campos requeridos y que la subcategoría pertenezca a la categoría', async () => {
    const incompleto = await camila.post('/api/tickets', { ...nuevoTicket, asunto: '' })
    expect(incompleto.status).toBe(400)
    expect(incompleto.body.fieldErrors).toMatchObject({ asunto: 'Completa este campo.' })

    const incompatible = await camila.post('/api/tickets', { ...nuevoTicket, subcategoriaId: 'sub-12' })
    expect(incompatible.status).toBe(400)
    expect(incompatible.body.fieldErrors).toHaveProperty('subcategoriaId')
  })

  it('requiere sesión y el rol de usuario para registrar tickets', async () => {
    expect((await api().post('/api/tickets').send(nuevoTicket)).status).toBe(401)

    const tecnico = conSesion(await ingresar(JULIO))
    const respuesta = await tecnico.post('/api/tickets', nuevoTicket)
    expect(respuesta.status).toBe(403)
    expect(respuesta.body.code).toBe('FORBIDDEN')
  })
})
