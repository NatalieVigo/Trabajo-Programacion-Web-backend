import { beforeEach, describe, expect, it } from 'vitest'
import db from '../src/db/models/index.cjs'
import { CAMILA, JULIO, LUCIA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

// Las pruebas comparten la base; los tickets que agregan están en meses sin tickets del seed (mayo y junio).

let supervisora
beforeEach(async () => {
  supervisora = conToken(await ingresar(LUCIA))
})

const tablero = (desde, hasta) => api().get('/api/metricas/tablero').query({ desde, hasta }).set(supervisora)
const carga = (desde, hasta) => api().get('/api/metricas/carga-tecnicos').query({ desde, hasta }).set(supervisora)

// un ticket cerrado de Camila en el aula A-201, con su historial de estados y asignaciones
async function agregarTicket(id, { creadoEn, cerradoEn, asignadoA = 'usr-002', eventos = [] }) {
  await db.ticket.create({
    id: `tck-${id}`,
    codigo: `TCK-2026-${id}`,
    usuarioId: 'usr-001',
    categoriaId: 'cat-01',
    ambienteId: 'amb-01',
    asignadoA,
    estado: 'cerrado',
    prioridad: 'alta',
    creadoEn,
    cerradoEn,
  })
  await db.historial.bulkCreate(
    eventos.map((evento, indice) => ({ id: `his-${id}${indice}`, ticketId: `tck-${id}`, autorId: 'usr-003', ...evento })),
  )
}

describe('GET /api/metricas/tablero (p30)', () => {
  it('responde 401 sin sesión y 403 a quien no es supervisor', async () => {
    const consulta = { desde: '2026-09-01', hasta: '2026-09-30' }
    expect((await api().get('/api/metricas/tablero').query(consulta)).status).toBe(401)
    for (const cuenta of [CAMILA, JULIO]) {
      const token = conToken(await ingresar(cuenta))
      expect((await api().get('/api/metricas/tablero').query(consulta).set(token)).status).toBe(403)
    }
  })

  it('valida el rango en el servidor', async () => {
    for (const [desde, hasta] of [[undefined, undefined], ['2026-02-30', '2026-03-01'], ['2026-09-02', '2026-09-01']]) {
      const respuesta = await tablero(desde, hasta)
      expect(respuesta.status).toBe(400)
      expect(respuesta.body).toMatchObject({ code: 'VALIDATION_ERROR', fieldErrors: { periodo: expect.any(String) } })
    }
  })

  it('resume el periodo con sus distribuciones por estado, categoría y ambiente', async () => {
    const respuesta = await tablero('2026-09-02', '2026-10-01')

    expect(respuesta.status).toBe(200)
    const d = respuesta.body
    expect(d).toMatchObject({ rango: { desde: '2026-09-02', hasta: '2026-10-01' }, sede: 'Campus Monterrico' })
    expect(d).toMatchObject({ total: 7, abiertos: 5, sinAsignar: 2, fueraDePlazo: 7, porcentajeFuera: 100 })
    expect(d.porEstado.reduce((total, e) => total + e.total, 0)).toBe(7)
    expect(d.porCategoria.reduce((total, c) => total + c.total, 0)).toBe(7)
    expect(d.porCategoria[0]).toEqual({ id: 'cat-01', nombre: 'Audiovisuales', total: 4 })
    expect(d.ambientes[0]).toEqual({ id: 'amb-09', nombre: 'AUD-CEN', total: 2 })
  })

  it('incluye el día completo de Lima y descuenta las esperas del promedio', async () => {
    await agregarTicket('90001', {
      creadoEn: '2026-05-01T05:00:00Z', // 00:00 del 1 de mayo en Lima
      cerradoEn: '2026-05-01T09:00:00Z',
      eventos: [
        { tipo: 'estado', estado: 'abierto', creadoEn: '2026-05-01T05:00:00Z' },
        { tipo: 'estado', estado: 'en_espera', creadoEn: '2026-05-01T06:00:00Z' },
        { tipo: 'estado', estado: 'en_atencion', creadoEn: '2026-05-01T08:00:00Z' },
        { tipo: 'estado', estado: 'resuelto', creadoEn: '2026-05-01T09:00:00Z' },
      ],
    })
    // 23:59:59 del 1 de mayo en Lima: entra en el día, pero se resolvió el 2
    await agregarTicket('90002', { creadoEn: '2026-05-02T04:59:59Z', cerradoEn: '2026-05-02T09:00:00Z' })
    // ya es 2 de mayo en Lima
    await agregarTicket('90003', { creadoEn: '2026-05-02T05:00:00Z', cerradoEn: '2026-05-02T09:00:00Z' })

    const { body } = await tablero('2026-05-01', '2026-05-01')

    expect(body.total).toBe(2)
    // 1 h abierto + 1 h en atención; las 2 h en espera no cuentan
    expect(body.promedioMs).toBe(2 * 3_600_000)
  })

  it('un periodo sin tickets no da NaN ni porcentajes infinitos', async () => {
    const { body } = await tablero('2030-01-01', '2030-01-31')

    expect(body).toMatchObject({ total: 0, porcentajeFuera: 0, variacionTickets: null, promedioMs: null, fueraDePlazo: 0 })
    expect(body.ambientes).toEqual([])
  })
})

describe('GET /api/metricas/carga-tecnicos (p31)', () => {
  it('muestra la carga actual de cada técnico activo y sugiere a quién repartir los críticos', async () => {
    const respuesta = await carga('2026-09-02', '2026-10-01')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.filas.map(({ id }) => id)).toEqual(['usr-002', 'usr-008', 'usr-009', 'usr-010'])
    expect(respuesta.body.filas[0]).toMatchObject({
      nombre: 'Julio Paredes Soto',
      especialidad: 'Audiovisuales · Redes y conectividad',
      asignados: 2,
      resueltos: 2,
      enEspera: 1,
      // en este periodo nadie respondió encuestas
      satisfaccion: null,
    })
    expect(respuesta.body).toMatchObject({ totalAsignados: 3, promedioAsignados: 0.75 })
    expect(respuesta.body.aviso).toBe(
      'Julio Paredes Soto concentra 2 de los 3 tickets asignados. Considera repartir los tickets críticos con ' +
        'Sandra Nolasco Ríos, que cuenta con habilitación compatible.',
    )
  })

  it('promedia las encuestas (HU-6) respondidas en el periodo sobre los tickets que resolvió cada técnico', async () => {
    const { body } = await carga('2026-08-01', '2026-09-01')

    const satisfaccion = Object.fromEntries(body.filas.map(({ id, satisfaccion }) => [id, satisfaccion]))
    // Julio: 5, 4, 5 y 5; Marco: 4; Iván: 4; Sandra: 3
    expect(satisfaccion).toEqual({ 'usr-002': 4.75, 'usr-008': 4, 'usr-009': 4, 'usr-010': 3 })
  })

  it('atribuye el resuelto al técnico que lo tenía en esa fecha y descuenta la espera', async () => {
    await agregarTicket('90004', {
      creadoEn: '2026-06-01T12:00:00Z',
      cerradoEn: '2026-06-01T16:00:00Z',
      asignadoA: 'usr-009',
      eventos: [
        { tipo: 'estado', estado: 'abierto', creadoEn: '2026-06-01T12:00:00Z' },
        { tipo: 'asignacion', asignadoA: 'usr-002', creadoEn: '2026-06-01T12:00:00Z' },
        { tipo: 'estado', estado: 'en_espera', creadoEn: '2026-06-01T13:00:00Z' },
        { tipo: 'estado', estado: 'en_atencion', creadoEn: '2026-06-01T15:00:00Z' },
        { tipo: 'estado', estado: 'resuelto', creadoEn: '2026-06-01T16:00:00Z' },
        { tipo: 'asignacion', asignadoA: 'usr-009', creadoEn: '2026-06-02T12:00:00Z' },
      ],
    })

    const { body } = await carga('2026-06-01', '2026-06-30')

    expect(body.filas.find(({ id }) => id === 'usr-002')).toMatchObject({ resueltos: 1, promedioMs: 2 * 3_600_000 })
    expect(body.filas.find(({ id }) => id === 'usr-009')).toMatchObject({ resueltos: 0, promedioMs: null })
  })

  it('responde 403 a un técnico y valida el rango', async () => {
    const tecnico = conToken(await ingresar(JULIO))
    const consulta = { desde: '2026-09-01', hasta: '2026-09-30' }
    expect((await api().get('/api/metricas/carga-tecnicos').query(consulta).set(tecnico)).status).toBe(403)
    expect((await carga('2026-09-30', '2026-09-01')).status).toBe(400)
  })
})
