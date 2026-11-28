import { enTransaccion, siguienteId } from '../db/pool.js'
import { ambientesRepository, pabellonesRepository, sedesRepository } from '../repositories/ubicaciones.repository.js'
import { usosCatalogoRepository } from '../repositories/usosCatalogo.repository.js'
import {
  CATALOGO_MESSAGES,
  TIPOS_AMBIENTE,
  normalizeCodigo,
  parseEntero,
  validateAmbiente,
  validatePabellon,
  validateSede,
} from '../utils/catalogoValidators.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'
import { hasErrors, normalizeNombre } from '../utils/validators.js'
import {
  assertNombreLibre,
  contarPor,
  enUsoError,
  enumerar,
  nombreTomado,
  pick,
  pluralize,
  porNombre,
  sinDuplicados,
} from './catalogoComun.js'

const CAMPOS_PABELLON = ['sedeId', 'nombre']
const CAMPOS_AMBIENTE = ['codigo', 'nombre', 'tipo', 'pabellonId', 'piso', 'capacidad']

const SIN_TICKETS = Object.freeze({ total: 0, enCurso: 0 })

const porCodigo = (a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true })

async function buscar(repositorio, id, code, mensaje) {
  const registro = await repositorio.buscar(id)
  if (!registro) throw new ServiceError(404, code, mensaje)
  return registro
}

const buscarSede = (id) => buscar(sedesRepository, id, 'SEDE_NOT_FOUND', 'No encontramos esta sede.')
const buscarPabellon = (id) => buscar(pabellonesRepository, id, 'PABELLON_NOT_FOUND', 'No encontramos este pabellón.')
const buscarAmbiente = (id) => buscar(ambientesRepository, id, 'AMBIENTE_NOT_FOUND', 'No encontramos este ambiente.')

const codigoTomado = () =>
  new ServiceError(409, 'CODE_TAKEN', CATALOGO_MESSAGES.codigoTaken, { codigo: CATALOGO_MESSAGES.codigoTaken })

// Sedes y pabellones (p14)

// una sede se puede borrar si no tiene pabellones, y un pabellón si no tiene ambientes
export async function listarSedes() {
  const [sedes, pabellones, ambientes] = await Promise.all([
    sedesRepository.listar(),
    pabellonesRepository.listar(),
    ambientesRepository.listar(),
  ])
  const ambientesPorPabellon = contarPor(ambientes, 'pabellonId')
  pabellones.sort(porNombre)
  return sedes.sort(porNombre).map((sede) => {
    const propios = pabellones
      .filter((pabellon) => pabellon.sedeId === sede.id)
      .map((pabellon) => {
        const total = ambientesPorPabellon.get(pabellon.id) ?? 0
        return { ...pabellon, ambientes: total, eliminable: total === 0 }
      })
    const total = propios.reduce((suma, pabellon) => suma + pabellon.ambientes, 0)
    return { ...sede, pabellones: propios, ambientes: total, eliminable: propios.length === 0 }
  })
}

async function validarSede(valores, idActual) {
  const fieldErrors = validateSede(valores)
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)
  const nombre = normalizeNombre(valores.nombre)
  assertNombreLibre(await sedesRepository.listar(), nombre, CATALOGO_MESSAGES.sedeTaken, idActual)
  return { nombre }
}

export async function crearSede(datos) {
  const campos = await validarSede(datos ?? {})
  const id = await sinDuplicados(
    () =>
      enTransaccion(async (db) => {
        const sede = { id: await siguienteId(db, 'sedes', 'sed', 2), ...campos }
        await sedesRepository.insertar(sede, db)
        return sede.id
      }),
    nombreTomado(CATALOGO_MESSAGES.sedeTaken),
  )
  return buscarSede(id)
}

export async function actualizarSede(id, datos) {
  const sede = await buscarSede(id)
  const campos = await validarSede({ ...sede, ...pick(datos ?? {}, ['nombre']) }, id)
  await sinDuplicados(() => sedesRepository.actualizar(id, campos), nombreTomado(CATALOGO_MESSAGES.sedeTaken))
  return buscarSede(id)
}

export async function eliminarSede(id) {
  const sede = await buscarSede(id)
  const pabellones = (await pabellonesRepository.listar({ sedeId: id })).length
  if (pabellones > 0) {
    const mensaje = `No se puede eliminar «${sede.nombre}»: tiene ${pluralize(pabellones, 'pabellón', 'pabellones')}.`
    throw enUsoError(mensaje, { pabellones })
  }
  await sedesRepository.eliminar(id)
  return sede
}

// el nombre no se puede repetir dentro de la misma sede
async function validarPabellon(valores, idActual) {
  const sedes = (await sedesRepository.listar()).map((sede) => sede.id)
  const fieldErrors = validatePabellon(valores, { sedes })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)
  const campos = { sedeId: valores.sedeId, nombre: normalizeNombre(valores.nombre) }
  const vecinos = await pabellonesRepository.listar({ sedeId: campos.sedeId })
  assertNombreLibre(vecinos, campos.nombre, CATALOGO_MESSAGES.pabellonTaken, idActual)
  return campos
}

export async function crearPabellon(datos) {
  const campos = await validarPabellon(pick(datos ?? {}, CAMPOS_PABELLON))
  const id = await sinDuplicados(
    () =>
      enTransaccion(async (db) => {
        const pabellon = { id: await siguienteId(db, 'pabellones', 'pab', 2), ...campos }
        await pabellonesRepository.insertar(pabellon, db)
        return pabellon.id
      }),
    nombreTomado(CATALOGO_MESSAGES.pabellonTaken),
  )
  return buscarPabellon(id)
}

export async function actualizarPabellon(id, datos) {
  const pabellon = await buscarPabellon(id)
  const campos = await validarPabellon({ ...pabellon, ...pick(datos ?? {}, CAMPOS_PABELLON) }, id)
  await sinDuplicados(() => pabellonesRepository.actualizar(id, campos), nombreTomado(CATALOGO_MESSAGES.pabellonTaken))
  return buscarPabellon(id)
}

export async function eliminarPabellon(id) {
  const pabellon = await buscarPabellon(id)
  const ambientes = (await ambientesRepository.listar({ pabellonId: id })).length
  if (ambientes > 0) {
    const mensaje = `No se puede eliminar el pabellón «${pabellon.nombre}»: tiene ${pluralize(ambientes, 'ambiente', 'ambientes')}.`
    throw enUsoError(mensaje, { ambientes })
  }
  await pabellonesRepository.eliminar(id)
  return pabellon
}

// Ambientes (p14 y el modal de p15)

// tickets y usuarios son de otras historias, aquí solo se leen
async function contextoDeAmbientes() {
  const [tickets, habituales, pabellones, sedes] = await Promise.all([
    usosCatalogoRepository.ticketsPor('ambienteId'),
    usosCatalogoRepository.usuariosPorAmbienteHabitual(),
    pabellonesRepository.listar(),
    sedesRepository.listar(),
  ])
  return {
    tickets,
    habituales,
    pabellones: new Map(pabellones.map((pabellon) => [pabellon.id, pabellon])),
    sedes: new Map(sedes.map((sede) => [sede.id, sede])),
  }
}

function presentarAmbiente(ambiente, contexto) {
  const pabellon = contexto.pabellones.get(ambiente.pabellonId)
  const sede = pabellon ? contexto.sedes.get(pabellon.sedeId) : undefined
  const tickets = contexto.tickets.get(ambiente.id) ?? SIN_TICKETS
  const usos = { tickets: tickets.total, usuarios: contexto.habituales.get(ambiente.id) ?? 0 }
  return {
    ...ambiente,
    pabellonNombre: pabellon?.nombre ?? null,
    sedeId: sede?.id ?? null,
    sedeNombre: sede?.nombre ?? null,
    ticketsEnCurso: tickets.enCurso,
    usos,
    eliminable: usos.tickets === 0 && usos.usuarios === 0,
  }
}

async function obtenerAmbiente(id) {
  return presentarAmbiente(await buscarAmbiente(id), await contextoDeAmbientes())
}

export async function listarAmbientes() {
  const [ambientes, contexto] = await Promise.all([ambientesRepository.listar(), contextoDeAmbientes()])
  return ambientes.sort(porCodigo).map((ambiente) => presentarAmbiente(ambiente, contexto))
}

// si no tiene nombre se arma con tipo y código, por ejemplo "Laboratorio H-212"
async function validarAmbiente(valores, idActual) {
  const pabellones = (await pabellonesRepository.listar()).map((pabellon) => pabellon.id)
  const fieldErrors = validateAmbiente(valores, { pabellones })
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  const codigo = normalizeCodigo(valores.codigo)
  const ambientes = await ambientesRepository.listar()
  if (ambientes.some((ambiente) => ambiente.id !== idActual && ambiente.codigo === codigo)) throw codigoTomado()
  return {
    codigo,
    nombre: normalizeNombre(valores.nombre) || `${TIPOS_AMBIENTE[valores.tipo]} ${codigo}`,
    tipo: valores.tipo,
    pabellonId: valores.pabellonId,
    piso: parseEntero(valores.piso),
    capacidad: parseEntero(valores.capacidad),
  }
}

export async function crearAmbiente(datos) {
  const campos = await validarAmbiente(pick(datos ?? {}, CAMPOS_AMBIENTE))
  const id = await sinDuplicados(
    () =>
      enTransaccion(async (db) => {
        const ambiente = { id: await siguienteId(db, 'ambientes', 'amb', 2), ...campos }
        await ambientesRepository.insertar(ambiente, db)
        return ambiente.id
      }),
    codigoTomado(),
  )
  return obtenerAmbiente(id)
}

// los campos que no se envían se quedan como estaban
export async function actualizarAmbiente(id, datos) {
  const ambiente = await buscarAmbiente(id)
  const campos = await validarAmbiente({ ...ambiente, ...pick(datos ?? {}, CAMPOS_AMBIENTE) }, id)
  await sinDuplicados(() => ambientesRepository.actualizar(id, campos), codigoTomado())
  return obtenerAmbiente(id)
}

// no se borra si tiene tickets o alguien lo tiene como ambiente habitual
export async function eliminarAmbiente(id) {
  const ambiente = await obtenerAmbiente(id)
  if (!ambiente.eliminable) {
    const { tickets, usuarios } = ambiente.usos
    const partes = [
      tickets > 0 && pluralize(tickets, 'ticket registrado', 'tickets registrados'),
      usuarios > 0 &&
        pluralize(usuarios, 'usuario que lo tiene como ambiente habitual', 'usuarios que lo tienen como ambiente habitual'),
    ].filter(Boolean)
    throw enUsoError(`No se puede eliminar «${ambiente.codigo}»: tiene ${enumerar(partes)}.`, ambiente.usos)
  }
  await ambientesRepository.eliminar(id)
  return ambiente
}
