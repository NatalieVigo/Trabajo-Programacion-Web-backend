import { beforeAll, describe, expect, it } from 'vitest'
import db from '../src/db/models/index.cjs'
import { AHORA, CAMILA, JULIO, LUCIA, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'

usarBaseDePrueba()

// Las pruebas corren en orden sobre la misma base: cada bloque dice qué ticket cambia.

const RENZO = { correo: 'renzo.salazar@aloe.ulima.edu.pe', password: 'Demo2026' }
const SANDRA = { correo: 'snolasco@ulima.edu.pe', password: 'Demo2026' }

// lo reportó Camila y lo atiende Julio, salvo EN_ESPERA, que lo reportó Milagros
const EN_ATENCION = 'TCK-2026-00144'
const EN_ESPERA = 'TCK-2026-00143'
const RESUELTO = 'TCK-2026-00141'
const SIN_ASIGNAR = 'TCK-2026-00147'
const CERRADO = 'TCK-2026-00131'

const ESPERA = { estado: 'en_espera', motivo: 'Tomacorriente solicitado al almacén.', retornoEstimado: '2026-10-05' }
const SOLUCION = 'Se reemplazó el cable de red y se probó la conexión.'

let camila
let julio
let lucia
let renzo
let sandra
beforeAll(async () => {
  ;[camila, julio, lucia, renzo, sandra] = (await Promise.all([CAMILA, JULIO, LUCIA, RENZO, SANDRA].map(ingresar))).map(conToken)
})

const ver = (codigo, sesion) => api().get(`/api/atencion/${codigo}`).set(sesion)
const escribir = (codigo, sesion, datos) => api().post(`/api/atencion/${codigo}/bitacora`).set(sesion).send(datos)
const cambiarEstado = (codigo, sesion, datos) => api().patch(`/api/atencion/${codigo}/estado`).set(sesion).send(datos)
const cerrar = (codigo, sesion, datos) => api().patch(`/api/atencion/${codigo}/cierre`).set(sesion).send(datos)

const ticketDe = (codigo) => db.ticket.findOne({ where: { codigo }, raw: true })
const ultimoEvento = async (ticketId) =>
  db.historial.findOne({ where: { ticketId }, order: [['creadoEn', 'DESC'], ['id', 'DESC']], raw: true })

describe('GET /api/atencion/:codigo (p25)', () => {
  it('devuelve el reporte con su categoría, su ambiente y las personas, sin correos', async () => {
    const respuesta = await ver(EN_ATENCION, julio)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.ticket).toMatchObject({
      id: 'tck-00144',
      codigo: EN_ATENCION,
      asunto: 'Punto de red caído en laboratorio',
      estado: 'en_atencion',
      prioridad: 'critica',
      creadoEn: '2026-09-29T20:40:00.000Z',
      cerradoEn: null,
      categoria: { id: 'cat-02', nombre: 'Redes y conectividad' },
      ambiente: { id: 'amb-05', codigo: 'H-210', tipo: 'laboratorio', pabellon: 'H', sede: 'Campus Monterrico' },
      solicitante: { id: 'usr-001', nombres: 'Camila Alejandra', rol: 'usuario', telefono: '987654321' },
      tecnico: { id: 'usr-002', nombres: 'Julio César', apellidos: 'Paredes Soto', rol: 'tecnico' },
    })
    expect(respuesta.body.ticket.ambiente.ticketsEnCurso).toEqual(expect.any(Number))
    expect(JSON.stringify(respuesta.body)).not.toMatch(/correo|password/)
  })

  it('el equipo lee toda la bitácora y quien reportó el ticket solo los comentarios públicos', async () => {
    const delEquipo = (await ver(EN_ATENCION, julio)).body.bitacora
    const deCamila = (await ver(EN_ATENCION, camila)).body.bitacora

    expect(delEquipo.map(({ tipo }) => tipo)).toContain('interno')
    expect(deCamila.length).toBeGreaterThan(0)
    expect(deCamila.every(({ tipo }) => tipo === 'publico')).toBe(true)
    expect(deCamila).toHaveLength(delEquipo.filter(({ tipo }) => tipo === 'publico').length)
    const fechas = delEquipo.map(({ creadoEn }) => creadoEn)
    expect(fechas).toEqual([...fechas].sort())
  })

  it('solo el técnico asignado cambia el estado y cierra; otro técnico solo lee', async () => {
    expect((await ver(EN_ATENCION, julio)).body.permisos).toEqual({
      verInternas: true,
      comentar: true,
      notaInterna: true,
      transiciones: ['en_espera', 'resuelto'],
      cerrar: true,
    })
    expect((await ver(EN_ATENCION, camila)).body.permisos).toEqual({
      verInternas: false,
      comentar: true,
      notaInterna: false,
      transiciones: [],
      cerrar: false,
    })
    expect((await ver(EN_ATENCION, sandra)).body.permisos).toMatchObject({ comentar: false, notaInterna: false, cerrar: false })
  })

  it('un ticket en espera trae su motivo, desde cuándo espera y la fecha estimada de retorno', async () => {
    const { espera } = (await ver(EN_ESPERA, julio)).body

    expect(espera).toEqual({
      motivo: expect.any(String),
      retornoEstimado: expect.any(String),
      desde: expect.any(String),
      retornoVencido: expect.any(Boolean),
    })
  })

  it('trae los tiempos de la atención y el historial del ticket', async () => {
    const { tiempos, eventos, desenlace } = (await ver(EN_ATENCION, julio)).body

    expect(tiempos).toMatchObject({ esperadoHoras: expect.any(Number), dentroDelPlazo: expect.any(Boolean) })
    expect(tiempos.totalMs).toBe(tiempos.atencionMs + tiempos.enEsperaMs)
    expect(eventos.at(-1)).toMatchObject({ tipo: 'estado', estado: 'en_atencion', enCurso: true })
    expect(desenlace).toBeNull()
  })

  it('encuentra el ticket aunque el código llegue en minúsculas o con espacios', async () => {
    expect((await ver(' tck-2026-00144 ', julio)).status).toBe(200)
  })

  it('responde 403 a quien no es del equipo ni reportó el ticket, 404 si no existe y 401 sin sesión', async () => {
    const ajeno = await ver(EN_ATENCION, renzo)
    expect(ajeno.status).toBe(403)
    expect(ajeno.body.message).toBe('No tienes permiso para ver este ticket.')

    const inexistente = await ver('TCK-2026-99999', julio)
    expect(inexistente.status).toBe(404)
    expect(inexistente.body.code).toBe('TICKET_NOT_FOUND')

    expect((await api().get(`/api/atencion/${EN_ATENCION}`)).status).toBe(401)
  })
})

describe('POST /api/atencion/:codigo/bitacora (p25)', () => {
  it('el técnico asignado publica un comentario y recibe la atención actualizada', async () => {
    const respuesta = await escribir(EN_ATENCION, julio, { tipo: 'publico', mensaje: '  Voy en camino al laboratorio.  ' })

    expect(respuesta.status).toBe(201)
    expect(respuesta.body.bitacora.at(-1)).toMatchObject({
      tipo: 'publico',
      mensaje: 'Voy en camino al laboratorio.',
      creadoEn: AHORA,
      autor: { id: 'usr-002', nombres: 'Julio César' },
    })
  })

  it('una nota interna la lee el equipo pero no quien reportó el ticket', async () => {
    await escribir(EN_ATENCION, julio, { tipo: 'interno', mensaje: 'Revisar el switch del piso 2.' })

    const delEquipo = (await ver(EN_ATENCION, lucia)).body.bitacora
    const deCamila = (await ver(EN_ATENCION, camila)).body.bitacora
    expect(delEquipo.at(-1).mensaje).toBe('Revisar el switch del piso 2.')
    expect(deCamila.map(({ mensaje }) => mensaje)).not.toContain('Revisar el switch del piso 2.')
  })

  it('quien reportó el ticket comenta, pero no escribe notas internas', async () => {
    expect((await escribir(EN_ATENCION, camila, { tipo: 'publico', mensaje: 'Gracias, los espero.' })).status).toBe(201)

    const interna = await escribir(EN_ATENCION, camila, { tipo: 'interno', mensaje: 'Nota' })
    expect(interna.status).toBe(403)
    expect(interna.body.message).toBe('Solo el técnico asignado y el supervisor registran notas internas.')
  })

  it('el supervisor escribe en un ticket sin asignar; otro técnico no escribe en uno ajeno', async () => {
    expect((await escribir(SIN_ASIGNAR, lucia, { tipo: 'interno', mensaje: 'Priorizar mañana.' })).status).toBe(201)

    const ajeno = await escribir(EN_ATENCION, sandra, { tipo: 'publico', mensaje: 'Hola' })
    expect(ajeno.status).toBe(403)
    expect(ajeno.body.message).toBe(
      'Solo quien reportó el ticket, el técnico asignado y el supervisor comentan en su bitácora.',
    )
  })

  it('un ticket cerrado responde 409 y no guarda nada', async () => {
    const antes = await db.bitacora.count()

    const respuesta = await escribir(CERRADO, lucia, { tipo: 'publico', mensaje: 'Hola' })

    expect(respuesta.status).toBe(409)
    expect(respuesta.body.message).toBe('El ticket está cerrado: su bitácora ya no admite entradas.')
    expect(await db.bitacora.count()).toBe(antes)
  })

  it('vuelve a validar el tipo y el mensaje', async () => {
    const respuesta = await escribir(EN_ATENCION, julio, { tipo: 'otro', mensaje: '   ' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({
      tipo: 'Elige si es un comentario público o una nota interna.',
      mensaje: 'Escribe un mensaje antes de guardar.',
    })
  })
})

describe('PATCH /api/atencion/:codigo/estado (p26)', () => {
  it('rechaza con 409 un cambio que el estado actual no admite, e indica los que sí', async () => {
    const respuesta = await cambiarEstado(EN_ATENCION, julio, { estado: 'abierto' })

    expect(respuesta.status).toBe(409)
    expect(respuesta.body).toMatchObject({
      code: 'INVALID_TRANSITION',
      message: 'El ticket está en atención y no admite el cambio a «Abierto».',
      details: { estado: 'en_atencion', permitidas: ['en_espera', 'resuelto'] },
    })
  })

  it('la espera pide motivo y una fecha de retorno de hoy en adelante', async () => {
    const sinDatos = await cambiarEstado(EN_ATENCION, julio, { estado: 'en_espera' })
    expect(sinDatos.status).toBe(400)
    expect(sinDatos.body.fieldErrors).toEqual({
      motivo: 'Indica el motivo de la espera.',
      retornoEstimado: 'Indica la fecha estimada de retorno.',
    })

    const pasada = await cambiarEstado(EN_ATENCION, julio, { ...ESPERA, retornoEstimado: '2026-09-30' })
    expect(pasada.body.fieldErrors).toEqual({ retornoEstimado: 'La fecha de retorno no puede ser anterior a hoy.' })
    expect((await ticketDe(EN_ATENCION)).estado).toBe('en_atencion')
  })

  it('pasa a en espera con el motivo y el retorno como el fin de ese día en Lima, y lo deja en el historial', async () => {
    const respuesta = await cambiarEstado(EN_ATENCION, julio, ESPERA)

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.ticket.estado).toBe('en_espera')
    expect(respuesta.body.espera).toEqual({
      motivo: ESPERA.motivo,
      retornoEstimado: '2026-10-06T04:59:59.000Z',
      desde: AHORA,
      retornoVencido: false,
    })
    expect(await ultimoEvento('tck-00144')).toMatchObject({
      tipo: 'estado',
      estado: 'en_espera',
      autorId: 'usr-002',
      motivo: ESPERA.motivo,
    })
    expect((await ticketDe(EN_ATENCION)).estado).toBe('en_espera')
  })

  it('al retomar la atención la espera termina', async () => {
    const respuesta = await cambiarEstado(EN_ESPERA, julio, { estado: 'en_atencion', motivo: 'se ignora' })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.ticket.estado).toBe('en_atencion')
    expect(respuesta.body.espera).toBeNull()
    expect(await ultimoEvento('tck-00143')).toMatchObject({ estado: 'en_atencion', motivo: null })
  })

  it('solo el técnico que tiene asignado el ticket cambia su estado', async () => {
    for (const sesion of [lucia, sandra]) {
      const respuesta = await cambiarEstado(EN_ESPERA, sesion, { estado: 'resuelto' })
      expect(respuesta.status).toBe(403)
      expect(respuesta.body.message).toBe('Solo el técnico que tiene asignado el ticket cambia su estado.')
    }
  })

  it('exige un estado que exista y no cambia un ticket cerrado', async () => {
    const inexistente = await cambiarEstado(EN_ESPERA, julio, { estado: 'pausado' })
    expect(inexistente.status).toBe(400)
    expect(inexistente.body.fieldErrors).toEqual({ estado: 'Elige el nuevo estado.' })

    expect((await cambiarEstado(CERRADO, julio, { estado: 'en_atencion' })).status).toBe(409)
  })
})

describe('PATCH /api/atencion/:codigo/cierre (p26)', () => {
  it('no cierra un ticket en espera', async () => {
    const respuesta = await cerrar(EN_ATENCION, julio, { solucion: SOLUCION })

    expect(respuesta.status).toBe(409)
    expect(respuesta.body.message).toBe('El ticket está en espera: solo se cierra un ticket en atención o resuelto.')
  })

  it('exige la descripción de la solución', async () => {
    const respuesta = await cerrar(EN_ESPERA, julio, { solucion: 'Listo' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({ solucion: 'Describe la solución con al menos 10 caracteres.' })
  })

  it('cierra un ticket en atención con su solución, su fecha de cierre y su desenlace', async () => {
    const respuesta = await cerrar(EN_ESPERA, julio, { solucion: `  ${SOLUCION}  ` })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.ticket).toMatchObject({ estado: 'cerrado', cerradoEn: AHORA })
    expect(respuesta.body.desenlace).toEqual({
      solucion: SOLUCION,
      cerradoEn: AHORA,
      cerradoPor: { id: 'usr-002', nombres: 'Julio César', apellidos: 'Paredes Soto', rol: 'tecnico' },
    })
    expect(respuesta.body.permisos).toMatchObject({ comentar: false, transiciones: [], cerrar: false })
    expect(await ultimoEvento('tck-00143')).toMatchObject({ estado: 'cerrado', solucion: SOLUCION, autorId: 'usr-002' })
    expect(new Date((await ticketDe(EN_ESPERA)).cerradoEn).toISOString()).toBe(AHORA)
  })

  it('también cierra un ticket resuelto, pero solo su técnico', async () => {
    const deCamila = await cerrar(RESUELTO, camila, { solucion: SOLUCION })
    expect(deCamila.status).toBe(403)
    expect(deCamila.body.message).toBe('Solo el técnico que tiene asignado el ticket lo cierra.')

    expect((await cerrar(RESUELTO, julio, { solucion: SOLUCION })).body.ticket.estado).toBe('cerrado')
  })
})

describe('GET /api/atencion/:codigo/historial (p27)', () => {
  it('devuelve cada cambio con su autor y su duración, el tiempo por etapa y los tiempos', async () => {
    const respuesta = await api().get(`/api/atencion/${CERRADO}/historial`).set(camila)

    expect(respuesta.status).toBe(200)
    const { eventos, etapas, tiempos } = respuesta.body
    expect(eventos[0]).toMatchObject({ tipo: 'estado', estado: 'abierto', autor: { id: 'usr-001' } })
    expect(eventos.at(-1)).toMatchObject({ estado: 'cerrado', duracionMs: 0, enCurso: false })
    expect(eventos.some(({ tipo }) => tipo === 'asignacion')).toBe(true)
    expect(etapas.map(({ estado }) => estado)).not.toContain('cerrado')
    expect(tiempos.totalMs).toBe(etapas.reduce((total, { ms }) => total + ms, 0))
    expect(JSON.stringify(respuesta.body)).not.toMatch(/correo|password/)
  })

  it('no lo consulta quien no es del equipo ni reportó el ticket', async () => {
    expect((await api().get(`/api/atencion/${CERRADO}/historial`).set(renzo)).status).toBe(403)
  })
})

describe('GET /api/atencion (p24)', () => {
  it('devuelve los tickets a cargo del técnico, primero los de actividad más reciente', async () => {
    const respuesta = await api().get('/api/atencion').set(julio)

    expect(respuesta.status).toBe(200)
    const asignados = await db.ticket.count({ where: { asignadoA: 'usr-002' } })
    expect(respuesta.body).toHaveLength(asignados)
    // los que cambiaron en estas pruebas van primero
    expect(respuesta.body.slice(0, 3).map(({ codigo }) => codigo).sort()).toEqual([EN_ESPERA, RESUELTO, EN_ATENCION].sort())
    const fechas = respuesta.body.map(({ actualizadoEn }) => actualizadoEn)
    expect(fechas).toEqual([...fechas].sort().reverse())
    expect(respuesta.body[0]).toMatchObject({
      categoria: { id: expect.any(String), nombre: expect.any(String) },
      ambiente: { codigo: expect.any(String) },
      dentroDelPlazo: expect.any(Boolean),
    })
    expect(JSON.stringify(respuesta.body)).not.toMatch(/correo|password/)
  })

  it('solo los técnicos tienen un historial de atención', async () => {
    const respuesta = await api().get('/api/atencion').set(camila)

    expect(respuesta.status).toBe(403)
    expect(respuesta.body.code).toBe('FORBIDDEN')
  })
})
