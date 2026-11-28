import { beforeEach, describe, expect, it } from 'vitest'
import { ambientesRepository, pabellonesRepository, sedesRepository } from '../src/repositories/ubicaciones.repository.js'
import { CATALOGO_MESSAGES } from '../src/utils/catalogoValidators.js'
import { CAMILA, JULIO, LUCIA, api, ingresar, usarBaseDePrueba } from './ayuda.js'
import { conSesion, contarFilas, restaurarCatalogo } from './ayudaCatalogo.js'

usarBaseDePrueba()

let supervisora
beforeEach(async () => {
  await restaurarCatalogo()
  supervisora = conSesion(await ingresar(LUCIA))
})

const laboratorio = { codigo: ' h-212 ', tipo: 'laboratorio', nombre: '', pabellonId: 'pab-04', piso: '2', capacidad: '30' }

describe('sedes y pabellones (p14)', () => {
  it('lista las sedes con sus pabellones por nombre y cuántos ambientes tiene cada uno', async () => {
    const respuesta = await supervisora.get('/api/sedes')
    const [monterrico] = respuesta.body

    expect(respuesta.status).toBe(200)
    expect(monterrico).toMatchObject({ id: 'sed-01', nombre: 'Campus Monterrico', ambientes: 11, eliminable: false })
    expect(monterrico.pabellones.map((pabellon) => pabellon.nombre)).toEqual([
      'A',
      'Biblioteca',
      'C',
      'Central',
      'E',
      'H',
      'L',
      'N',
      'Q',
    ])
    expect(monterrico.pabellones[0]).toEqual({ id: 'pab-01', sedeId: 'sed-01', nombre: 'A', ambientes: 2, eliminable: false })
  })

  it('crea, renombra y elimina una sede sin pabellones', async () => {
    const creada = await supervisora.post('/api/sedes', { nombre: '  Campus   San Isidro ' })
    expect(creada.status).toBe(201)
    expect(creada.body).toEqual({ id: 'sed-02', nombre: 'Campus San Isidro' })

    expect((await supervisora.patch('/api/sedes/sed-02', { nombre: 'Local San Isidro' })).body).toEqual({
      id: 'sed-02',
      nombre: 'Local San Isidro',
    })
    expect((await supervisora.delete('/api/sedes/sed-02')).body).toMatchObject({ id: 'sed-02' })
    expect(await sedesRepository.buscar('sed-02')).toBeNull()
  })

  it('no repite el nombre de una sede y no elimina una sede con pabellones', async () => {
    const repetida = await supervisora.post('/api/sedes', { nombre: 'campus monterrico' })
    expect(repetida.status).toBe(409)
    expect(repetida.body).toMatchObject({ code: 'NAME_TAKEN', fieldErrors: { nombre: CATALOGO_MESSAGES.sedeTaken } })

    const enUso = await supervisora.delete('/api/sedes/sed-01')
    expect(enUso.status).toBe(409)
    expect(enUso.body).toMatchObject({
      code: 'IN_USE',
      message: 'No se puede eliminar «Campus Monterrico»: tiene 9 pabellones.',
      details: { usos: { pabellones: 9 } },
    })
    expect(await contarFilas('sedes')).toBe(1)
  })

  it('crea un pabellón en una sede, sin repetir su nombre dentro de ella', async () => {
    const { id: sedeId } = (await supervisora.post('/api/sedes', { nombre: 'Campus San Isidro' })).body

    const creado = await supervisora.post('/api/pabellones', { sedeId: 'sed-01', nombre: 'J' })
    expect(creado.status).toBe(201)
    expect(creado.body).toEqual({ id: 'pab-10', sedeId: 'sed-01', nombre: 'J' })

    const repetido = await supervisora.post('/api/pabellones', { sedeId: 'sed-01', nombre: 'h' })
    expect(repetido.status).toBe(409)
    expect(repetido.body.fieldErrors).toEqual({ nombre: CATALOGO_MESSAGES.pabellonTaken })

    expect((await supervisora.post('/api/pabellones', { sedeId, nombre: 'H' })).body).toMatchObject({ sedeId, nombre: 'H' })
  })

  it('valida la sede del pabellón en el servidor (§7)', async () => {
    const respuesta = await supervisora.post('/api/pabellones', { sedeId: 'sed-99', nombre: '' })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({
      sedeId: CATALOGO_MESSAGES.sedeUnknown,
      nombre: CATALOGO_MESSAGES.nombreRequired,
    })
  })

  it('edita un pabellón y solo elimina los que no tienen ambientes', async () => {
    expect((await supervisora.patch('/api/pabellones/pab-02', { nombre: 'C (administrativo)' })).body).toMatchObject({
      nombre: 'C (administrativo)',
      sedeId: 'sed-01',
    })

    const enUso = await supervisora.delete('/api/pabellones/pab-04')
    expect(enUso.status).toBe(409)
    expect(enUso.body).toMatchObject({ code: 'IN_USE', message: 'No se puede eliminar el pabellón «H»: tiene 2 ambientes.' })

    const { id } = (await supervisora.post('/api/pabellones', { sedeId: 'sed-01', nombre: 'J' })).body
    expect((await supervisora.delete(`/api/pabellones/${id}`)).body).toMatchObject({ nombre: 'J' })
    expect(await pabellonesRepository.buscar(id)).toBeNull()
  })

  it('responde 404 si no existe, 403 si no es un supervisor y 401 sin sesión', async () => {
    expect((await supervisora.patch('/api/sedes/sed-99', { nombre: 'X y Z' })).body).toMatchObject({ code: 'SEDE_NOT_FOUND' })
    expect((await supervisora.delete('/api/pabellones/pab-99')).body).toMatchObject({ code: 'PABELLON_NOT_FOUND' })

    const tecnico = conSesion(await ingresar(JULIO))
    expect((await tecnico.post('/api/sedes', { nombre: 'Campus San Isidro' })).status).toBe(403)
    expect((await tecnico.post('/api/pabellones', { sedeId: 'sed-01', nombre: 'J' })).status).toBe(403)
    expect((await api().get('/api/sedes')).status).toBe(401)
    expect(await contarFilas('pabellones')).toBe(9)
  })
})

describe('ambientes (p14 y p15)', () => {
  it('lista los ambientes por código con su ubicación, tickets en curso y lo que impide eliminarlos', async () => {
    const respuesta = await supervisora.get('/api/ambientes')
    const ambientes = respuesta.body

    expect(respuesta.status).toBe(200)
    expect(ambientes.map((ambiente) => ambiente.codigo)).toEqual([
      'A-201',
      'A-305',
      'AUD-CEN',
      'BIB-P2',
      'C-102',
      'E-304',
      'H-105',
      'H-210',
      'L-108',
      'N-402',
      'Q-101',
    ])
    expect(ambientes[0]).toEqual({
      id: 'amb-01',
      codigo: 'A-201',
      nombre: 'Aula A-201',
      tipo: 'aula',
      pabellonId: 'pab-01',
      piso: 2,
      capacidad: 68,
      pabellonNombre: 'A',
      sedeId: 'sed-01',
      sedeNombre: 'Campus Monterrico',
      ticketsEnCurso: 1,
      usos: { tickets: 3, usuarios: 1 },
      eliminable: false,
    })
    expect(ambientes.find((ambiente) => ambiente.codigo === 'C-102')).toMatchObject({
      usos: { tickets: 0, usuarios: 0 },
      eliminable: true,
    })
  })

  it('crea un ambiente con el código en mayúsculas y, sin nombre, lo arma con el tipo y el código', async () => {
    const creado = await supervisora.post('/api/ambientes', laboratorio)

    expect(creado.status).toBe(201)
    expect(creado.body).toMatchObject({
      id: 'amb-12',
      codigo: 'H-212',
      nombre: 'Laboratorio H-212',
      piso: 2,
      capacidad: 30,
      pabellonNombre: 'H',
      sedeNombre: 'Campus Monterrico',
      eliminable: true,
    })
    expect(await ambientesRepository.buscar('amb-12')).toEqual({
      id: 'amb-12',
      codigo: 'H-212',
      nombre: 'Laboratorio H-212',
      tipo: 'laboratorio',
      pabellonId: 'pab-04',
      piso: 2,
      capacidad: 30,
    })

    const conNombre = await supervisora.post('/api/ambientes', {
      ...laboratorio,
      codigo: 'H-213',
      nombre: '  Laboratorio   de Redes 2 ',
    })
    expect(conNombre.body).toMatchObject({ nombre: 'Laboratorio de Redes 2' })
  })

  it('no repite el código de un ambiente', async () => {
    const respuesta = await supervisora.post('/api/ambientes', { ...laboratorio, codigo: 'a-201' })

    expect(respuesta.status).toBe(409)
    expect(respuesta.body).toMatchObject({ code: 'CODE_TAKEN', fieldErrors: { codigo: CATALOGO_MESSAGES.codigoTaken } })
    expect(await contarFilas('ambientes')).toBe(11)
  })

  it('vuelve a validar los datos del ambiente en el servidor (§7)', async () => {
    const respuesta = await supervisora.post('/api/ambientes', {
      codigo: 'H 212',
      tipo: 'cafeteria',
      pabellonId: 'pab-99',
      piso: '30',
      capacidad: '0',
    })

    expect(respuesta.status).toBe(400)
    expect(respuesta.body.fieldErrors).toEqual({
      codigo: CATALOGO_MESSAGES.codigoFormato,
      tipo: CATALOGO_MESSAGES.tipoRequired,
      pabellonId: CATALOGO_MESSAGES.pabellonUnknown,
      piso: CATALOGO_MESSAGES.pisoRango,
      capacidad: CATALOGO_MESSAGES.capacidadRango,
    })
  })

  it('edita solo los campos enviados y conserva su código si no cambia', async () => {
    expect((await supervisora.patch('/api/ambientes/amb-01', { capacidad: '70', piso: 2 })).body).toMatchObject({
      codigo: 'A-201',
      nombre: 'Aula A-201',
      capacidad: 70,
    })

    const respuesta = await supervisora.patch('/api/ambientes/amb-01', { codigo: 'A-305' })
    expect(respuesta.status).toBe(409)
    expect(respuesta.body.code).toBe('CODE_TAKEN')
    expect((await ambientesRepository.buscar('amb-01')).codigo).toBe('A-201')
  })

  it('solo elimina los ambientes sin tickets ni usuarios que lo tengan como habitual', async () => {
    const enUso = await supervisora.delete('/api/ambientes/amb-01')
    expect(enUso.status).toBe(409)
    expect(enUso.body).toMatchObject({
      code: 'IN_USE',
      message: 'No se puede eliminar «A-201»: tiene 3 tickets registrados y 1 usuario que lo tiene como ambiente habitual.',
      details: { usos: { tickets: 3, usuarios: 1 } },
    })

    expect((await supervisora.delete('/api/ambientes/amb-11')).body).toMatchObject({ codigo: 'C-102' })
    expect(await ambientesRepository.buscar('amb-11')).toBeNull()
  })

  it('cualquier rol con sesión puede leerlos, porque HU-3 los ofrece al registrar un ticket', async () => {
    const respuesta = await conSesion(await ingresar(CAMILA)).get('/api/ambientes')

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toHaveLength(11)
    expect((await api().get('/api/ambientes')).status).toBe(401)
  })

  it('responde 404 si no existe y 403 si no es un supervisor', async () => {
    expect((await supervisora.patch('/api/ambientes/amb-99', { capacidad: '10' })).body).toMatchObject({
      code: 'AMBIENTE_NOT_FOUND',
    })

    const tecnico = conSesion(await ingresar(JULIO))
    expect((await tecnico.post('/api/ambientes', laboratorio)).body).toMatchObject({ code: 'FORBIDDEN' })
    expect((await tecnico.delete('/api/ambientes/amb-11')).status).toBe(403)
    expect(await contarFilas('ambientes')).toBe(11)
  })
})
