import { enTransaccion } from '../repositories/RepositoryBase.js'
import { categoriasRepository, subcategoriasRepository } from '../repositories/categorias.repository.js'
import { usosCatalogoRepository } from '../repositories/usosCatalogo.repository.js'
import { CATALOGO_MESSAGES, parseHoras, validateCategoria } from '../utils/catalogoValidators.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'
import { hasErrors, normalizeNombre } from '../utils/validators.js'
import {
  assertNombreLibre,
  enUsoError,
  enumerar,
  nombreTomado,
  pick,
  pluralize,
  porNombre,
  sinDuplicados,
} from './catalogoComun.js'

// categoriaId es el padre; vacío para una categoría principal
const CAMPOS = ['nombre', 'categoriaId', 'descripcion', 'activa', 'prioridadPorDefecto', 'tiempoEsperadoHoras']

const SIN_TICKETS = Object.freeze({ total: 0, enCurso: 0 })

// lee tickets y especialidades de otras historias, sin modificarlos
async function leerUsos() {
  const [porCategoria, porSubcategoria, especialidades] = await Promise.all([
    usosCatalogoRepository.ticketsPor('categoriaId'),
    usosCatalogoRepository.ticketsPor('subcategoriaId'),
    usosCatalogoRepository.especialidadesPorCategoria(),
  ])
  return { porCategoria, porSubcategoria, especialidades }
}

function presentarCategoria(categoria, totalSubcategorias, usos) {
  const tickets = usos.porCategoria.get(categoria.id) ?? SIN_TICKETS
  const enUso = {
    tickets: tickets.total,
    subcategorias: totalSubcategorias,
    especialidades: usos.especialidades.get(categoria.id) ?? 0,
  }
  return {
    tipo: 'categoria',
    ...categoria,
    ticketsEnCurso: tickets.enCurso,
    usos: enUso,
    eliminable: Object.values(enUso).every((cantidad) => cantidad === 0),
  }
}

// con la categoría inactiva, la subcategoría no está disponible aunque siga activa
function presentarSubcategoria(subcategoria, categoriaActiva, usos) {
  const tickets = usos.porSubcategoria.get(subcategoria.id) ?? SIN_TICKETS
  return {
    tipo: 'subcategoria',
    ...subcategoria,
    disponible: subcategoria.activa && categoriaActiva,
    ticketsEnCurso: tickets.enCurso,
    usos: { tickets: tickets.total },
    eliminable: tickets.total === 0,
  }
}

// los ids cat-xx son categorías y los sub-xx subcategorías; la misma ruta sirve para las dos
async function buscar(id) {
  const categoria = await categoriasRepository.buscar(id)
  if (categoria) return { tipo: 'categoria', registro: categoria }
  const subcategoria = await subcategoriasRepository.buscar(id)
  if (subcategoria) return { tipo: 'subcategoria', registro: subcategoria }
  throw new ServiceError(404, 'CATEGORY_NOT_FOUND', 'No encontramos esta categoría. Puede que se haya eliminado.')
}

async function presentar({ tipo, registro }) {
  const usos = await leerUsos()
  if (tipo === 'subcategoria') {
    const categoriaActiva = (await categoriasRepository.buscar(registro.categoriaId))?.activa ?? false
    return presentarSubcategoria(registro, categoriaActiva, usos)
  }
  const subcategorias = await subcategoriasRepository.listar({ categoriaId: registro.id })
  return presentarCategoria(registro, subcategorias.length, usos)
}

async function erroresDe(valores) {
  const categorias = (await categoriasRepository.listar()).map((categoria) => categoria.id)
  const fieldErrors = validateCategoria(valores, { categorias })
  if (typeof valores.activa !== 'boolean') fieldErrors.activa = 'Indica si está activa.'
  return fieldErrors
}

function camposGuardados(valores) {
  return {
    nombre: normalizeNombre(valores.nombre),
    descripcion: String(valores.descripcion ?? '').trim(),
    activa: valores.activa,
    prioridadPorDefecto: valores.prioridadPorDefecto,
    tiempoEsperadoHoras: parseHoras(valores.tiempoEsperadoHoras),
  }
}

const mensajeNombreTomado = (categoriaId) =>
  categoriaId ? CATALOGO_MESSAGES.subcategoriaTaken : CATALOGO_MESSAGES.categoriaTaken

// una subcategoría puede repetir nombre si está en otra categoría
async function assertNombreDisponible(nombre, categoriaId, idActual) {
  const filas = categoriaId ? await subcategoriasRepository.listar({ categoriaId }) : await categoriasRepository.listar()
  assertNombreLibre(filas, nombre, mensajeNombreTomado(categoriaId), idActual)
}

function mensajeEnUso({ nombre, usos }) {
  const partes = [
    usos.tickets > 0 && pluralize(usos.tickets, 'ticket registrado', 'tickets registrados'),
    usos.subcategorias > 0 && pluralize(usos.subcategorias, 'subcategoría', 'subcategorías'),
    usos.especialidades > 0 &&
      pluralize(
        usos.especialidades,
        'técnico que la declaró como especialidad',
        'técnicos que la declararon como especialidad',
      ),
  ].filter(Boolean)
  return `No se puede eliminar «${nombre}»: tiene ${enumerar(partes)}. Puedes desactivarla en su lugar.`
}

// Si tiene tickets en curso, pide confirmación antes de desactivar (p12).
function assertDesactivacionConfirmada(elemento, activa, confirmado) {
  const desactiva = elemento.activa && activa === false
  if (!desactiva || elemento.ticketsEnCurso === 0 || confirmado === true) return
  const tickets = pluralize(elemento.ticketsEnCurso, 'ticket en curso', 'tickets en curso')
  throw new ServiceError(
    409,
    'OPEN_TICKETS',
    `«${elemento.nombre}» tiene ${tickets}. Confirma la desactivación: seguirán atendiéndose, pero no se podrán registrar tickets nuevos.`,
    null,
    { details: { ticketsEnCurso: elemento.ticketsEnCurso } },
  )
}

// Catálogo completo (p12), con contadores y si cada elemento se puede eliminar.
export async function listar() {
  const [categorias, subcategorias, usos] = await Promise.all([
    categoriasRepository.listar(),
    subcategoriasRepository.listar(),
    leerUsos(),
  ])
  subcategorias.sort(porNombre)
  return categorias.sort(porNombre).map((categoria) => {
    const propias = subcategorias.filter((subcategoria) => subcategoria.categoriaId === categoria.id)
    return {
      ...presentarCategoria(categoria, propias.length, usos),
      subcategorias: propias.map((subcategoria) => presentarSubcategoria(subcategoria, categoria.activa, usos)),
    }
  })
}

export async function obtener(id) {
  return presentar(await buscar(id))
}

// Crea una categoría, o una subcategoría si viene categoriaId (p13).
export async function crear(datos) {
  const valores = { categoriaId: '', activa: true, ...pick(datos ?? {}, CAMPOS) }
  const fieldErrors = await erroresDe(valores)
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)

  const campos = camposGuardados(valores)
  const padreId = valores.categoriaId || null
  await assertNombreDisponible(campos.nombre, padreId)
  // la transacción evita que dos altas a la vez tomen el mismo id
  const id = await sinDuplicados(
    () =>
      enTransaccion(async (t) => {
        if (!padreId) {
          const categoria = { id: await categoriasRepository.nuevoId(t), ...campos }
          await categoriasRepository.insertar(categoria, t)
          return categoria.id
        }
        const subcategoria = { id: await subcategoriasRepository.nuevoId(t), categoriaId: padreId, ...campos }
        await subcategoriasRepository.insertar(subcategoria, t)
        return subcategoria.id
      }),
    nombreTomado(mensajeNombreTomado(padreId)),
  )
  return obtener(id)
}

// una categoría no pasa a subcategoría; una subcategoría sí puede cambiar de padre
export async function actualizar(id, datos) {
  const { tipo, registro } = await buscar(id)
  const valores = { ...registro, categoriaId: registro.categoriaId ?? '', ...pick(datos ?? {}, CAMPOS) }
  const fieldErrors = await erroresDe(valores)
  if (tipo === 'categoria' && valores.categoriaId) fieldErrors.categoriaId = CATALOGO_MESSAGES.padreNoPermitido
  if (tipo === 'subcategoria' && !valores.categoriaId) fieldErrors.categoriaId = CATALOGO_MESSAGES.padreRequired
  if (hasErrors(fieldErrors)) throw validationError(fieldErrors)
  assertDesactivacionConfirmada(await presentar({ tipo, registro }), valores.activa, datos?.confirmado)

  const campos = camposGuardados(valores)
  const padreId = tipo === 'categoria' ? null : valores.categoriaId
  await assertNombreDisponible(campos.nombre, padreId, id)
  await sinDuplicados(
    () =>
      tipo === 'categoria'
        ? categoriasRepository.actualizar(id, campos)
        : subcategoriasRepository.actualizar(id, { ...campos, categoriaId: padreId }),
    nombreTomado(mensajeNombreTomado(padreId)),
  )
  return obtener(id)
}

// Solo elimina lo que no se usa; las habilitaciones de la categoría se van con ella.
export async function eliminar(id) {
  const elemento = await presentar(await buscar(id))
  if (!elemento.eliminable) throw enUsoError(mensajeEnUso(elemento), elemento.usos)
  const repositorio = elemento.tipo === 'categoria' ? categoriasRepository : subcategoriasRepository
  await repositorio.eliminar(id)
  return { id, tipo: elemento.tipo, nombre: elemento.nombre }
}

// Lo inactivo no recibe tickets nuevos, pero los que ya tiene siguen su curso.
export async function cambiarEstado(id, datos) {
  const { activa, confirmado = false } = datos ?? {}
  if (typeof activa !== 'boolean') throw validationError({ activa: 'Indica si está activa.' })
  const { tipo, registro } = await buscar(id)
  assertDesactivacionConfirmada(await presentar({ tipo, registro }), activa, confirmado)
  const repositorio = tipo === 'categoria' ? categoriasRepository : subcategoriasRepository
  await repositorio.cambiarEstado(id, activa)
  return obtener(id)
}

// Lo que se ofrece al registrar tickets (HU-3); sin subcategorías activas no aparece.
export async function listarDisponibles() {
  const [categorias, subcategorias] = await Promise.all([
    categoriasRepository.listar({ soloActivas: true }),
    subcategoriasRepository.listar({ soloActivas: true }),
  ])
  const campos = ({ id, nombre, descripcion, prioridadPorDefecto, tiempoEsperadoHoras }) => ({
    id,
    nombre,
    descripcion,
    prioridadPorDefecto,
    tiempoEsperadoHoras,
  })
  subcategorias.sort(porNombre)
  return categorias
    .sort(porNombre)
    .map((categoria) => ({
      ...campos(categoria),
      subcategorias: subcategorias.filter((subcategoria) => subcategoria.categoriaId === categoria.id).map(campos),
    }))
    .filter((categoria) => categoria.subcategorias.length > 0)
}
