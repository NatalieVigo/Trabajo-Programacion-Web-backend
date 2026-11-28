import { beforeEach, describe, expect, it, vi } from 'vitest'
import db from '../src/db/models/index.cjs'
import { CAMILA, JULIO, LUCIA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

// Las pruebas corren en orden sobre la misma base. El reloj está en el 1 de octubre de 2026 (ver ayuda.js): Camila
// tiene pendiente la encuesta de TCK-2026-00131 (cerrado el 28 de septiembre) y sus otras 7 ya no se pueden editar.

let camila
beforeEach(async () => {
  camila = conToken(await ingresar(CAMILA))
})

const respuesta = { puntajeGeneral: 5, rapidez: 4, trato: 5, solucion: 4, comentario: 'Llegó rápido y explicó la falla.' }
const responder = (codigo, datos, token = camila) => api().put(`/api/encuestas/${codigo}`).set(token).send(datos)
const encuestasDe = (ticketId) => db.encuesta.findAll({ where: { ticketId }, raw: true })

describe('GET /api/encuestas (p28)', () => {
  it('lista las encuestas de la persona, de la más reciente a la más antigua, con su promedio', async () => {
    const respuesta = await api().get('/api/encuestas').set(camila)

    expect(respuesta.status).toBe(200)
    // 5, 4, 4, 5, 3, 5 y 4
    expect(respuesta.body).toMatchObject({ totalRespondidas: 7, promedioGeneral: 4.3 })
    expect(respuesta.body.encuestas[0]).toMatchObject({
      codigoTicket: 'TCK-2026-00130',
      asunto: 'Extensión eléctrica en mal estado',
      tecnicoNombre: 'Iván Zegarra Pinto',
      puntajeGeneral: 4,
      rapidez: 4,
      trato: 5,
      solucion: 4,
      fechaRespuesta: '2026-09-01T23:40:00.000Z',
      fechaLimiteEdicion: '2026-09-08T23:40:00.000Z',
      editable: false,
    })
  })

  it('sin encuestas devuelve la lista vacía y 401 sin sesión', async () => {
    const tecnico = conToken(await ingresar(JULIO))
    const vacia = await api().get('/api/encuestas').set(tecnico)
    expect(vacia.body).toEqual({ encuestas: [], totalRespondidas: 0, promedioGeneral: 0 })
    expect((await api().get('/api/encuestas')).status).toBe(401)
  })
})

describe('GET /api/encuestas/:codigo (p27)', () => {
  it('devuelve la encuesta respondida o null con el plazo para responderla', async () => {
    const respondida = await api().get('/api/encuestas/TCK-2026-00130').set(camila)
    expect(respondida.status).toBe(200)
    expect(respondida.body).toMatchObject({ abierta: false, encuesta: { puntajeGeneral: 4, editable: false } })

    const pendiente = await api().get('/api/encuestas/TCK-2026-00131').set(camila)
    expect(pendiente.body).toEqual({ encuesta: null, abierta: true, plazoHasta: '2026-10-05T22:20:00.000Z' })
  })

  it('el ticket de otra persona responde 404', async () => {
    const tecnico = conToken(await ingresar(JULIO))
    const respuesta = await api().get('/api/encuestas/TCK-2026-00131').set(tecnico)
    expect(respuesta.status).toBe(404)
    expect(respuesta.body.code).toBe('TICKET_NOT_FOUND')
  })
})

describe('PUT /api/encuestas/:codigo', () => {
  it('no deja calificar el ticket de otra persona ni uno que no está cerrado', async () => {
    const ajeno = await responder('TCK-2026-00143', respuesta)
    expect(ajeno.status).toBe(404)

    const enAtencion = await responder('TCK-2026-00144', respuesta)
    expect(enAtencion.status).toBe(409)
    expect(enAtencion.body.code).toBe('TICKET_NOT_CLOSED')
  })

  it('valida en el servidor los puntajes del 1 al 5 y el largo del comentario', async () => {
    const malos = await responder('TCK-2026-00131', { ...respuesta, trato: 7, rapidez: 2.5, comentario: 'x'.repeat(501) })
    expect(malos.status).toBe(400)
    expect(Object.keys(malos.body.fieldErrors).sort()).toEqual(['comentario', 'rapidez', 'trato'])

    const sinPuntajes = await responder('TCK-2026-00131', {})
    expect(Object.keys(sinPuntajes.body.fieldErrors).sort()).toEqual(['puntajeGeneral', 'rapidez', 'solucion', 'trato'])
    expect(await encuestasDe('tck-00131')).toHaveLength(0)
  })

  it('después de los 7 días del cierre ya no se puede responder', async () => {
    vi.setSystemTime('2026-10-06T00:00:00.000Z')
    const tarde = conToken(await ingresar(CAMILA))

    const respuestaTarde = await responder('TCK-2026-00131', respuesta, tarde)

    expect(respuestaTarde.status).toBe(409)
    expect(respuestaTarde.body.code).toBe('SURVEY_EXPIRED')
  })

  it('registra la encuesta dentro del plazo y deja de estar pendiente para HU-1', async () => {
    const creada = await responder('TCK-2026-00131', { ...respuesta, comentario: '  Llegó rápido.  ' })

    expect(creada.status).toBe(201)
    expect(creada.body).toMatchObject({
      id: 'enc-008',
      codigoTicket: 'TCK-2026-00131',
      puntajeGeneral: 5,
      comentario: 'Llegó rápido.',
      fechaRespuesta: '2026-10-01T15:27:00.000Z',
      editable: true,
    })
    expect(await encuestasDe('tck-00131')).toEqual([
      expect.objectContaining({ id: 'enc-008', usuarioId: 'usr-001', puntaje: 5, rapidez: 4, trato: 5, solucion: 4 }),
    ])
    expect((await api().get('/api/cuenta/resumen').set(camila)).body.encuestaPendiente).toBeNull()
    const contadores = await api().get('/api/cuenta/contadores').set(camila)
    expect(contadores.body).toMatchObject({ encuestasPendientes: 0, encuestasRespondidas: 8 })
  })

  it('una sola respuesta por ticket: volver a enviarla la edita dentro del plazo', async () => {
    const editada = await responder('TCK-2026-00131', { ...respuesta, puntajeGeneral: 3, comentario: 'Volvió a fallar.' })

    expect(editada.status).toBe(200)
    expect(editada.body).toMatchObject({ id: 'enc-008', puntajeGeneral: 3, comentario: 'Volvió a fallar.' })
    expect(editada.body.editadaEn).toBe('2026-10-01T15:27:00.000Z')
    expect(await encuestasDe('tck-00131')).toHaveLength(1)
  })

  it('pasados 7 días desde la respuesta ya no se puede editar', async () => {
    const vencida = await responder('TCK-2026-00130', respuesta)

    expect(vencida.status).toBe(409)
    expect(vencida.body.code).toBe('SURVEY_EDIT_EXPIRED')
    expect((await encuestasDe('tck-00130'))[0]).toMatchObject({ puntaje: 4, comentario: expect.stringContaining('extensión') })
  })
})

describe('GET /api/encuestas/satisfaccion (p29)', () => {
  let supervisora
  beforeEach(async () => {
    supervisora = conToken(await ingresar(LUCIA))
  })
  const reporte = (consulta) => api().get('/api/encuestas/satisfaccion').query(consulta).set(supervisora)
  const AGOSTO = { desde: '2026-08-01', hasta: '2026-09-01' }

  it('solo la ve el supervisor y valida el periodo y el filtro', async () => {
    expect((await api().get('/api/encuestas/satisfaccion').query(AGOSTO).set(camila)).status).toBe(403)
    expect((await reporte({ desde: '2026-09-02', hasta: '2026-09-01' })).body.fieldErrors).toHaveProperty('periodo')
    expect((await reporte({ ...AGOSTO, puntaje: '2_4' })).body.fieldErrors).toHaveProperty('puntaje')
  })

  it('promedia por técnico y por categoría las encuestas del periodo', async () => {
    const { status, body } = await reporte(AGOSTO)

    expect(status).toBe(200)
    // los 7 tickets cerrados en el periodo tienen encuesta
    expect(body).toMatchObject({ totalRespondidas: 7, promedioGeneral: 4.3, tasaRespuesta: 100 })
    expect(body.promedioPorAspecto).toEqual({ rapidez: 4, trato: 4.7, solucion: 4.3 })
    expect(body.tablaTecnicos.map(({ tecnicoNombre }) => tecnicoNombre)).toEqual([
      'Iván Zegarra Pinto',
      'Julio Paredes Soto',
      'Marco Huamán Vela',
      'Sandra Nolasco Ríos',
    ])
    expect(body.tablaTecnicos[1]).toMatchObject({
      categoriaPrincipal: 'Audiovisuales',
      general: 4.8,
      rapidez: 4.8,
      trato: 4.8,
      solucion: 4.8,
      encuestasCount: 4,
    })
    expect(body.tablaTecnicos[3]).toMatchObject({ categoriaPrincipal: 'Climatización', general: 3, rapidez: 2 })
    expect(body.porCategoria.map(({ categoria, general }) => [categoria, general])).toEqual([
      ['Audiovisuales', 4.7],
      ['Climatización', 3],
      ['Eléctrico', 4],
      ['Mobiliario', 4],
      ['Redes y conectividad', 5],
    ])
  })

  it('lista los comentarios del más reciente al más antiguo y los filtra por puntaje', async () => {
    const todos = await reporte(AGOSTO)
    expect(todos.body.comentarios.map(({ id }) => id)).toEqual(['enc-007', 'enc-005', 'enc-004', 'enc-002', 'enc-001'])
    expect(todos.body.comentarios[1]).toMatchObject({
      puntaje: 3,
      categoria: 'Climatización',
      tecnicoNombre: 'Sandra Nolasco Ríos',
      fecha: '2026-08-28T14:35:00.000Z',
    })

    const bajos = await reporte({ ...AGOSTO, puntaje: '1_3' })
    expect(bajos.body.comentarios.map(({ id }) => id)).toEqual(['enc-005'])
    const altos = await reporte({ ...AGOSTO, puntaje: '4_5' })
    expect(altos.body.comentarios.map(({ id }) => id)).toEqual(['enc-007', 'enc-004', 'enc-002', 'enc-001'])
  })

  it('un periodo sin encuestas no da NaN', async () => {
    const { body } = await reporte({ desde: '2030-01-01', hasta: '2030-01-31' })
    expect(body).toMatchObject({ totalRespondidas: 0, promedioGeneral: 0, tasaRespuesta: 0, tablaTecnicos: [], comentarios: [] })
    expect(body.promedioPorAspecto).toEqual({ rapidez: null, trato: null, solucion: null })
  })
})
