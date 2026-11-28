import { beforeEach, describe, expect, it } from 'vitest'
import { JULIO, LUCIA, api, ingresar, usarBaseDePrueba } from './ayuda.js'
import { cambiarEstadoDeCuenta, conSesion, contarFilas, db, restaurarCatalogo } from './ayudaCatalogo.js'

usarBaseDePrueba()

const JULIO_ID = 'usr-002'
const SANDRA_ID = 'usr-010'

let supervisora
beforeEach(async () => {
  await restaurarCatalogo()
  supervisora = conSesion(await ingresar(LUCIA))
})

async function habilitadasDe(tecnicoId) {
  const filas = await db.habilitacion.findAll({ where: { tecnicoId }, order: [['categoriaId', 'ASC']] })
  return filas.map((fila) => fila.categoriaId)
}

describe('GET /api/habilitaciones (p16)', () => {
  it('devuelve las categorías por nombre con sus tickets en curso', async () => {
    const respuesta = await supervisora.get('/api/habilitaciones')
    const { categorias } = respuesta.body

    expect(respuesta.status).toBe(200)
    expect(categorias.map(({ nombre }) => nombre)).toEqual([
      'Accesos y cerraduras',
      'Audiovisuales',
      'Climatización',
      'Eléctrico',
      'Limpieza',
      'Mobiliario',
      'Redes y conectividad',
    ])
    expect(categorias[1]).toEqual({ id: 'cat-01', nombre: 'Audiovisuales', activa: true, ticketsEnCurso: 2 })
  })

  it('devuelve los técnicos activos con su especialidad declarada, su carga y sus habilitaciones', async () => {
    const { tecnicos } = (await supervisora.get('/api/habilitaciones')).body

    expect(tecnicos.map(({ id }) => id)).toEqual(['usr-009', JULIO_ID, 'usr-008', SANDRA_ID])
    expect(tecnicos[1]).toEqual({
      id: JULIO_ID,
      nombres: 'Julio César',
      apellidos: 'Paredes Soto',
      especialidades: ['cat-01', 'cat-02'],
      carga: 2,
      habilitadas: ['cat-07', 'cat-01', 'cat-02'],
    })
    expect(tecnicos[0]).toMatchObject({ especialidades: ['cat-07', 'cat-04'], carga: 0, habilitadas: ['cat-07', 'cat-04', 'cat-05'] })
    expect(tecnicos[3]).toMatchObject({ carga: 1 })
  })

  it('no incluye a los técnicos bloqueados ni a los supervisores', async () => {
    await cambiarEstadoDeCuenta('usr-008', 'bloqueado')
    try {
      const { tecnicos } = (await supervisora.get('/api/habilitaciones')).body

      expect(tecnicos.map(({ id }) => id)).toEqual(['usr-009', JULIO_ID, SANDRA_ID])
    } finally {
      await cambiarEstadoDeCuenta('usr-008', 'activo')
    }
  })
})

describe('PUT /api/habilitaciones (p16)', () => {
  it('deja a cada técnico enviado con las categorías indicadas y no toca a los demás', async () => {
    const respuesta = await supervisora.put('/api/habilitaciones', { [JULIO_ID]: ['cat-01', 'cat-06'], [SANDRA_ID]: [] })

    expect(respuesta.status).toBe(200)
    expect(await habilitadasDe(JULIO_ID)).toEqual(['cat-01', 'cat-06'])
    expect(await habilitadasDe(SANDRA_ID)).toEqual([])
    expect(await habilitadasDe('usr-009')).toEqual(['cat-04', 'cat-05', 'cat-07'])
    expect(respuesta.body.tecnicos.find(({ id }) => id === JULIO_ID).habilitadas).toEqual(['cat-01', 'cat-06'])
  })

  it('no duplica una habilitación que ya existe', async () => {
    await supervisora.put('/api/habilitaciones', { [JULIO_ID]: ['cat-01', 'cat-01', 'cat-02', 'cat-07'] })

    expect(await habilitadasDe(JULIO_ID)).toHaveLength(3)
    expect(await contarFilas('habilitaciones')).toBe(10)
  })

  it('rechaza técnicos que no están activos y categorías que no existen, sin guardar nada', async () => {
    const usuario = await supervisora.put('/api/habilitaciones', { 'usr-001': ['cat-01'] })
    expect(usuario.status).toBe(400)
    expect(usuario.body.code).toBe('VALIDATION_ERROR')

    const categoria = await supervisora.put('/api/habilitaciones', { [JULIO_ID]: ['cat-01'], [SANDRA_ID]: ['cat-99'] })
    expect(categoria.status).toBe(400)
    expect(await habilitadasDe(JULIO_ID)).toEqual(['cat-01', 'cat-02', 'cat-07'])
  })

  it('solo un supervisor puede ver y guardar la matriz', async () => {
    const tecnico = conSesion(await ingresar(JULIO))

    expect((await tecnico.get('/api/habilitaciones')).status).toBe(403)
    expect((await tecnico.put('/api/habilitaciones', { [JULIO_ID]: [] })).body).toMatchObject({ code: 'FORBIDDEN' })
    expect((await api().put('/api/habilitaciones').send({ [JULIO_ID]: [] })).status).toBe(401)
    expect(await habilitadasDe(JULIO_ID)).toHaveLength(3)
  })
})
