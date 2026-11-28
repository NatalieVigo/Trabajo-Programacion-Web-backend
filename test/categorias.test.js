import { beforeEach, describe, expect, it } from 'vitest'
import { categoriasRepository, subcategoriasRepository } from '../src/repositories/categorias.repository.js'
import { CATALOGO_MESSAGES } from '../src/utils/catalogoValidators.js'
import { CAMILA, JULIO, LUCIA, api, ingresar, usarBaseDePrueba } from './ayuda.js'
import { actualizarTicket, cambiarEstadoDeCuenta, conSesion, contarFilas, db, restaurarCatalogo } from './ayudaCatalogo.js'

usarBaseDePrueba()

let supervisora
beforeEach(async () => {
  await restaurarCatalogo()
  supervisora = conSesion(await ingresar(LUCIA))
})

const nueva = {
  nombre: '  Señalética   y rotulado ',
  categoriaId: '',
  prioridadPorDefecto: 'baja',
  tiempoEsperadoHoras: '48',
  descripcion: '  Letreros dañados o ausentes en pasillos y ambientes. ',
  activa: true,
}

const listar = async () => (await supervisora.get('/api/categorias')).body
const desactivar = (id, confirmado) => supervisora.patch(`/api/categorias/${id}/estado`, { activa: false, confirmado })

describe('GET /api/categorias (p12)', () => {
  it('devuelve las categorías por nombre, cada una con sus subcategorías por nombre', async () => {
    const respuesta = await supervisora.get('/api/categorias')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.map((categoria) => categoria.nombre)).toEqual([
      'Accesos y cerraduras',
      'Audiovisuales',
      'Climatización',
      'Eléctrico',
      'Limpieza',
      'Mobiliario',
      'Redes y conectividad',
    ])
    expect(respuesta.body[1].subcategorias.map((subcategoria) => subcategoria.nombre)).toEqual([
      'Audio sin señal',
      'Ecran atascado',
      'Imagen distorsionada',
      'Proyector no enciende',
    ])
  })

  it('cuenta los tickets en curso de cada categoría y lo que impide eliminarla', async () => {
    const [accesos, audiovisuales] = await listar()

    expect(audiovisuales).toMatchObject({
      tipo: 'categoria',
      id: 'cat-01',
      prioridadPorDefecto: 'alta',
      tiempoEsperadoHoras: 4,
      ticketsEnCurso: 2,
      usos: { tickets: 7, subcategorias: 4, especialidades: 2 },
      eliminable: false,
    })
    expect(accesos).toMatchObject({ ticketsEnCurso: 0, usos: { tickets: 0, subcategorias: 2, especialidades: 1 } })
    expect(audiovisuales.subcategorias[3]).toEqual({
      tipo: 'subcategoria',
      id: 'sub-01',
      categoriaId: 'cat-01',
      nombre: 'Proyector no enciende',
      descripcion: 'El proyector no prende o se apaga a los pocos minutos de uso.',
      activa: true,
      prioridadPorDefecto: 'critica',
      tiempoEsperadoHoras: 2,
      disponible: true,
      ticketsEnCurso: 0,
      usos: { tickets: 0 },
      eliminable: true,
    })
  })

  it('un ticket reabierto sigue en curso', async () => {
    await actualizarTicket('tck-00103', { estado: 'reabierto' })

    const [, audiovisuales] = await listar()

    expect(audiovisuales.ticketsEnCurso).toBe(3)
  })

  it('cuenta los tickets de una subcategoría cuando el ticket la indica', async () => {
    await actualizarTicket('tck-00147', { subcategoriaId: 'sub-01' })

    const [, audiovisuales] = await listar()
    const proyector = audiovisuales.subcategorias.find((subcategoria) => subcategoria.id === 'sub-01')

    expect(proyector).toMatchObject({ ticketsEnCurso: 1, usos: { tickets: 1 }, eliminable: false })
  })

  it('solo la ve un supervisor; sin sesión responde 401', async () => {
    const tecnico = await conSesion(await ingresar(JULIO)).get('/api/categorias')

    expect(tecnico.status).toBe(403)
    expect(tecnico.body.code).toBe('FORBIDDEN')
    expect((await api().get('/api/categorias')).status).toBe(401)
  })
})

describe('GET /api/categorias/:id (p13)', () => {
  it('devuelve la categoría o la subcategoría con su tipo', async () => {
    expect((await supervisora.get('/api/categorias/cat-03')).body).toMatchObject({ tipo: 'categoria', nombre: 'Climatización' })
    expect((await supervisora.get('/api/categorias/sub-12')).body).toMatchObject({
      tipo: 'subcategoria',
      nombre: 'Luminaria apagada',
      categoriaId: 'cat-04',
    })
  })

  it('responde 404 si no existe', async () => {
    const respuesta = await supervisora.get('/api/categorias/cat-99')

    expect(respuesta.status).toBe(404)
    expect(respuesta.body.code).toBe('CATEGORY_NOT_FOUND')
  })
})

describe('GET /api/categorias/disponibles (HU-3)', () => {
  it('cualquier rol con sesión ve las categorías activas con sus subcategorías activas', async () => {
    const respuesta = await conSesion(await ingresar(CAMILA)).get('/api/categorias/disponibles')
    const climatizacion = respuesta.body.find(({ nombre }) => nombre === 'Climatización')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toHaveLength(7)
    expect(climatizacion).toEqual({
      id: 'cat-03',
      nombre: 'Climatización',
      descripcion: 'Aire acondicionado, ventilación y fugas de condensado.',
      prioridadPorDefecto: 'alta',
      tiempoEsperadoHoras: 8,
      subcategorias: [
        {
          id: 'sub-08',
          nombre: 'Aire sin frío',
          descripcion: 'El aire acondicionado enciende pero no enfría el ambiente.',
          prioridadPorDefecto: 'alta',
          tiempoEsperadoHoras: 8,
        },
        {
          id: 'sub-09',
          nombre: 'Fuga de condensado',
          descripcion: 'Goteo de agua desde el equipo de aire acondicionado.',
          prioridadPorDefecto: 'alta',
          tiempoEsperadoHoras: 8,
        },
      ],
    })
  })

  it('no ofrece una categoría activa cuyas subcategorías están todas inactivas', async () => {
    await desactivar('sub-17')
    await desactivar('sub-18')

    const disponibles = (await supervisora.get('/api/categorias/disponibles')).body

    expect(disponibles.map(({ nombre }) => nombre)).not.toContain('Limpieza')
    expect(disponibles).toHaveLength(6)
    expect((await categoriasRepository.buscar('cat-06')).activa).toBe(true)
  })

  it('sin sesión responde 401', async () => {
    expect((await api().get('/api/categorias/disponibles')).status).toBe(401)
  })
})

describe('POST /api/categorias (p13)', () => {
  it('crea una categoría principal con los datos normalizados', async () => {
    const respuesta = await supervisora.post('/api/categorias', nueva)

    expect(respuesta.status).toBe(201)
    expect(respuesta.body).toEqual({
      tipo: 'categoria',
      id: 'cat-08',
      nombre: 'Señalética y rotulado',
      descripcion: 'Letreros dañados o ausentes en pasillos y ambientes.',
      activa: true,
      prioridadPorDefecto: 'baja',
      tiempoEsperadoHoras: 48,
      ticketsEnCurso: 0,
      usos: { tickets: 0, subcategorias: 0, especialidades: 0 },
      eliminable: true,
    })
    expect(await categoriasRepository.buscar('cat-08')).toEqual({
      id: 'cat-08',
      nombre: 'Señalética y rotulado',
      descripcion: 'Letreros dañados o ausentes en pasillos y ambientes.',
      activa: true,
      prioridadPorDefecto: 'baja',
      tiempoEsperadoHoras: 48,
    })
  })

  it('con una categoría padre crea una subcategoría de ella', async () => {
    const respuesta = await supervisora.post('/api/categorias', {
      ...nueva,
      nombre: 'Cable HDMI dañado',
      categoriaId: 'cat-01',
      prioridadPorDefecto: 'alta',
      tiempoEsperadoHoras: 4,
    })

    expect(respuesta.status).toBe(201)
    expect(respuesta.body).toMatchObject({ tipo: 'subcategoria', id: 'sub-21', categoriaId: 'cat-01', tiempoEsperadoHoras: 4 })
    expect(await subcategoriasRepository.buscar('sub-21')).toMatchObject({ categoriaId: 'cat-01', nombre: 'Cable HDMI dañado' })
  })

  it('queda activa si no se indica lo contrario', async () => {
    const datos = { ...nueva }
    delete datos.activa

    expect((await supervisora.post('/api/categorias', datos)).body).toMatchObject({ activa: true })
    expect((await supervisora.post('/api/categorias', { ...nueva, nombre: 'Jardinería', activa: false })).body).toMatchObject({
      activa: false,
    })
  })

  it('vuelve a validar los datos en el servidor (§7)', async () => {
    const respuesta = await supervisora.post('/api/categorias', {
      nombre: ' ',
      categoriaId: 'cat-99',
      prioridadPorDefecto: 'urgente',
      tiempoEsperadoHoras: '0',
      descripcion: 'x'.repeat(241),
      activa: 'sí',
    })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.code).toBe('VALIDATION_ERROR')
    expect(respuesta.body.fieldErrors).toEqual({
      nombre: CATALOGO_MESSAGES.nombreRequired,
      categoriaId: CATALOGO_MESSAGES.padreUnknown,
      prioridadPorDefecto: CATALOGO_MESSAGES.prioridadRequired,
      tiempoEsperadoHoras: CATALOGO_MESSAGES.horasPositivo,
      descripcion: CATALOGO_MESSAGES.descripcionMax,
      activa: 'Indica si está activa.',
    })
    expect(await contarFilas('categorias')).toBe(7)
    expect(await contarFilas('subcategorias')).toBe(20)
  })

  it('no repite el nombre de una categoría, sin distinguir mayúsculas ni tildes', async () => {
    const respuesta = await supervisora.post('/api/categorias', { ...nueva, nombre: 'CLIMATIZACION' })

    expect(respuesta.status).toBe(409)
    expect(respuesta.body).toMatchObject({ code: 'NAME_TAKEN', fieldErrors: { nombre: CATALOGO_MESSAGES.categoriaTaken } })
    expect(await contarFilas('categorias')).toBe(7)
  })

  it('no repite el nombre de una subcategoría dentro de su categoría, pero sí en otra', async () => {
    const repetida = await supervisora.post('/api/categorias', { ...nueva, nombre: 'proyector NO enciende', categoriaId: 'cat-01' })
    expect(repetida.status).toBe(409)
    expect(repetida.body.fieldErrors).toEqual({ nombre: CATALOGO_MESSAGES.subcategoriaTaken })

    const enOtra = await supervisora.post('/api/categorias', { ...nueva, nombre: 'Proyector no enciende', categoriaId: 'cat-04' })
    expect(enOtra.status).toBe(201)
    expect(enOtra.body).toMatchObject({ categoriaId: 'cat-04' })
  })

  it('solo un supervisor activo puede crear', async () => {
    const tecnico = conSesion(await ingresar(JULIO))
    expect((await tecnico.post('/api/categorias', nueva)).status).toBe(403)

    // si bloquean a la supervisora, su sesión deja de servir
    await cambiarEstadoDeCuenta('usr-003', 'bloqueado')
    try {
      expect((await supervisora.post('/api/categorias', nueva)).status).toBe(401)
    } finally {
      await cambiarEstadoDeCuenta('usr-003', 'activo')
    }
    expect(await contarFilas('categorias')).toBe(7)
  })
})

describe('PATCH /api/categorias/:id (p13)', () => {
  it('cambia solo los campos enviados', async () => {
    const respuesta = await supervisora.patch('/api/categorias/cat-03', {
      tiempoEsperadoHoras: '12',
      descripcion: ' Aire acondicionado y ventilación. ',
    })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toMatchObject({
      tipo: 'categoria',
      nombre: 'Climatización',
      prioridadPorDefecto: 'alta',
      activa: true,
      tiempoEsperadoHoras: 12,
      descripcion: 'Aire acondicionado y ventilación.',
    })
    expect((await categoriasRepository.buscar('cat-03')).tiempoEsperadoHoras).toBe(12)
  })

  it('una categoría puede conservar su nombre con otras mayúsculas, pero no tomar el de otra', async () => {
    expect((await supervisora.patch('/api/categorias/cat-03', { nombre: 'CLIMATIZACIÓN' })).body).toMatchObject({
      nombre: 'CLIMATIZACIÓN',
    })

    const respuesta = await supervisora.patch('/api/categorias/cat-03', { nombre: 'audiovisuales' })
    expect(respuesta.status).toBe(409)
    expect(respuesta.body.code).toBe('NAME_TAKEN')
  })

  it('una categoría principal no puede pasar a ser subcategoría', async () => {
    const respuesta = await supervisora.patch('/api/categorias/cat-03', { categoriaId: 'cat-01' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({ categoriaId: CATALOGO_MESSAGES.padreNoPermitido })
    expect(await categoriasRepository.buscar('cat-03')).not.toBeNull()
  })

  it('mueve una subcategoría a otra categoría, pero no la deja sin categoría', async () => {
    expect((await supervisora.patch('/api/categorias/sub-12', { categoriaId: 'cat-05' })).body).toMatchObject({
      tipo: 'subcategoria',
      categoriaId: 'cat-05',
    })

    const respuesta = await supervisora.patch('/api/categorias/sub-12', { categoriaId: '' })
    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({ categoriaId: CATALOGO_MESSAGES.padreRequired })
    expect((await subcategoriasRepository.buscar('sub-12')).categoriaId).toBe('cat-05')
  })

  it('al moverla, no repite un nombre de su nueva categoría', async () => {
    const respuesta = await supervisora.patch('/api/categorias/sub-14', { categoriaId: 'cat-01', nombre: 'Audio sin señal' })

    expect(respuesta.status).toBe(409)
    expect(respuesta.body.fieldErrors).toEqual({ nombre: CATALOGO_MESSAGES.subcategoriaTaken })
    expect(await subcategoriasRepository.buscar('sub-14')).toMatchObject({ categoriaId: 'cat-05', nombre: 'Silla rota' })
  })

  it('responde 404 si no existe y 403 si no es un supervisor', async () => {
    expect((await supervisora.patch('/api/categorias/sub-99', { nombre: 'Otra' })).status).toBe(404)
    const tecnico = conSesion(await ingresar(JULIO))
    expect((await tecnico.patch('/api/categorias/cat-03', { nombre: 'Otra' })).status).toBe(403)
    expect((await categoriasRepository.buscar('cat-03')).nombre).toBe('Climatización')
  })
})

describe('PATCH /api/categorias/:id/estado (p12)', () => {
  it('desactiva una categoría: sus subcategorías dejan de estar disponibles sin cambiar su propio estado', async () => {
    // tiene un ticket en curso, por eso va confirmado
    expect((await desactivar('cat-03', true)).body).toMatchObject({ tipo: 'categoria', activa: false })

    const climatizacion = (await listar()).find((categoria) => categoria.id === 'cat-03')
    expect(climatizacion.subcategorias.map(({ activa, disponible }) => ({ activa, disponible }))).toEqual([
      { activa: true, disponible: false },
      { activa: false, disponible: false },
      { activa: true, disponible: false },
    ])
    expect((await subcategoriasRepository.buscar('sub-08')).activa).toBe(true)

    await supervisora.patch('/api/categorias/cat-03/estado', { activa: true })
    expect((await categoriasRepository.buscar('cat-03')).activa).toBe(true)
  })

  it('activa o desactiva una subcategoría', async () => {
    expect((await supervisora.patch('/api/categorias/sub-10/estado', { activa: true })).body).toMatchObject({
      tipo: 'subcategoria',
      activa: true,
      disponible: true,
    })
    expect((await desactivar('sub-01')).body).toMatchObject({ activa: false, disponible: false })
  })

  it('una categoría inactiva ya no aparece en lo que leen las demás historias', async () => {
    await desactivar('cat-06')

    const disponibles = (await supervisora.get('/api/categorias/disponibles')).body
    // HU-1 la ofrece como especialidad al aceptar una invitación
    const opciones = (await api().get('/api/invitaciones/INV-TEC-2026-DEMO/opciones')).body

    expect(disponibles.map(({ nombre }) => nombre)).not.toContain('Limpieza')
    expect(opciones.categorias.map(({ id }) => id)).not.toContain('cat-06')
  })

  it('responde 400 si el estado no es booleano, 404 si no existe y 403 si no es un supervisor', async () => {
    expect((await supervisora.patch('/api/categorias/cat-03/estado', { activa: 'no' })).status).toBe(400)
    expect((await desactivar('cat-99')).status).toBe(404)
    const tecnico = conSesion(await ingresar(JULIO))
    expect((await tecnico.patch('/api/categorias/cat-03/estado', { activa: false })).status).toBe(403)
    expect((await categoriasRepository.buscar('cat-03')).activa).toBe(true)
  })
})

describe('confirmación al desactivar con tickets en curso (p12)', () => {
  it('sin confirmación no desactiva una categoría con tickets en curso y dice cuántos tiene', async () => {
    const respuesta = await desactivar('cat-01')

    expect(respuesta.status).toBe(409)
    expect(respuesta.body).toMatchObject({
      code: 'OPEN_TICKETS',
      message:
        '«Audiovisuales» tiene 2 tickets en curso. Confirma la desactivación: seguirán atendiéndose, pero no se ' +
        'podrán registrar tickets nuevos.',
      details: { ticketsEnCurso: 2 },
    })
    expect((await categoriasRepository.buscar('cat-01')).activa).toBe(true)

    expect((await desactivar('cat-01', true)).body).toMatchObject({ activa: false })
  })

  it('sin tickets en curso, y al activar, no hace falta confirmar', async () => {
    expect((await desactivar('cat-06')).body).toMatchObject({ activa: false })
    expect((await supervisora.patch('/api/categorias/cat-06/estado', { activa: true })).body).toMatchObject({ activa: true })
  })

  it('desactivarla desde el formulario también exige la confirmación', async () => {
    const sinConfirmar = await supervisora.patch('/api/categorias/cat-01', { activa: false, tiempoEsperadoHoras: '6' })
    expect(sinConfirmar.status).toBe(409)
    expect(sinConfirmar.body).toMatchObject({ code: 'OPEN_TICKETS', details: { ticketsEnCurso: 2 } })
    expect(await categoriasRepository.buscar('cat-01')).toMatchObject({ activa: true, tiempoEsperadoHoras: 4 })

    const confirmada = await supervisora.patch('/api/categorias/cat-01', {
      activa: false,
      tiempoEsperadoHoras: '6',
      confirmado: true,
    })
    expect(confirmada.body).toMatchObject({ activa: false, tiempoEsperadoHoras: 6 })
  })

  it('editar otros datos de una categoría activa con tickets en curso no pide confirmación', async () => {
    expect((await supervisora.patch('/api/categorias/cat-01', { tiempoEsperadoHoras: '6' })).body).toMatchObject({
      activa: true,
      tiempoEsperadoHoras: 6,
    })
  })

  it('también la pide para una subcategoría con tickets en curso', async () => {
    await actualizarTicket('tck-00147', { subcategoriaId: 'sub-01' })

    expect((await desactivar('sub-01')).body).toMatchObject({ code: 'OPEN_TICKETS', details: { ticketsEnCurso: 1 } })
  })
})

describe('DELETE /api/categorias/:id (p12)', () => {
  it('elimina una subcategoría sin tickets', async () => {
    const respuesta = await supervisora.delete('/api/categorias/sub-10')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toEqual({ id: 'sub-10', tipo: 'subcategoria', nombre: 'Calefacción sin funcionar' })
    expect(await subcategoriasRepository.buscar('sub-10')).toBeNull()
  })

  it('no elimina una categoría que se usa y explica por qué', async () => {
    const respuesta = await supervisora.delete('/api/categorias/cat-01')

    expect(respuesta.status).toBe(409)
    expect(respuesta.body).toMatchObject({
      code: 'IN_USE',
      message:
        'No se puede eliminar «Audiovisuales»: tiene 7 tickets registrados, 4 subcategorías y 2 técnicos que la ' +
        'declararon como especialidad. Puedes desactivarla en su lugar.',
      details: { usos: { tickets: 7, subcategorias: 4, especialidades: 2 } },
    })
    expect(await categoriasRepository.buscar('cat-01')).not.toBeNull()
  })

  it('una categoría se puede eliminar cuando ya no tiene subcategorías', async () => {
    const conSubcategorias = await supervisora.delete('/api/categorias/cat-06')
    expect(conSubcategorias.body.message).toBe(
      'No se puede eliminar «Limpieza»: tiene 2 subcategorías. Puedes desactivarla en su lugar.',
    )

    await supervisora.delete('/api/categorias/sub-17')
    await supervisora.delete('/api/categorias/sub-18')

    expect((await supervisora.delete('/api/categorias/cat-06')).body).toEqual({ id: 'cat-06', tipo: 'categoria', nombre: 'Limpieza' })
    expect(await categoriasRepository.buscar('cat-06')).toBeNull()
  })

  it('elimina con ella las habilitaciones de la categoría', async () => {
    const { id } = (await supervisora.post('/api/categorias', nueva)).body
    await db.habilitacion.create({ id: 'hab-011', tecnicoId: 'usr-002', categoriaId: id })

    expect((await supervisora.delete(`/api/categorias/${id}`)).status).toBe(200)

    const quedan = await db.habilitacion.findAll({ where: { categoriaId: id } })
    expect(quedan).toEqual([])
    expect(await contarFilas('habilitaciones')).toBe(10)
  })

  it('no elimina una subcategoría con tickets', async () => {
    await actualizarTicket('tck-00147', { subcategoriaId: 'sub-01' })

    const respuesta = await supervisora.delete('/api/categorias/sub-01')

    expect(respuesta.status).toBe(409)
    expect(respuesta.body).toMatchObject({
      code: 'IN_USE',
      message: 'No se puede eliminar «Proyector no enciende»: tiene 1 ticket registrado. Puedes desactivarla en su lugar.',
    })
    expect(await subcategoriasRepository.buscar('sub-01')).not.toBeNull()
  })

  it('responde 404 si no existe y 403 si no es un supervisor', async () => {
    expect((await supervisora.delete('/api/categorias/cat-99')).body).toMatchObject({ code: 'CATEGORY_NOT_FOUND' })
    const tecnico = conSesion(await ingresar(JULIO))
    expect((await tecnico.delete('/api/categorias/sub-10')).body).toMatchObject({ code: 'FORBIDDEN' })
    expect(await subcategoriasRepository.buscar('sub-10')).not.toBeNull()
  })
})
