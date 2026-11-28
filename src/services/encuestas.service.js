import { encuestasRepository } from '../repositories/encuestas.repository.js'
import { enTransaccion, esDuplicado } from '../repositories/RepositoryBase.js'
import { instantesDelPeriodo, validarPeriodo } from '../utils/periodo.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'

// HU-6 Encuesta de satisfacción (p27), mis encuestas (p28) y satisfacción por técnico y categoría (p29).
// Una encuesta por ticket cerrado: se responde hasta 7 días después del cierre (el mismo plazo con que HU-1 la muestra
// como pendiente) y se edita hasta 7 días después de responderla.
export const DIAS_DE_PLAZO = 7
const PLAZO_MS = DIAS_DE_PLAZO * 24 * 60 * 60 * 1000
const COMENTARIO_MAXIMO = 500

// el filtro de los comentarios por puntaje general
const FILTROS_DE_PUNTAJE = Object.freeze({
  todos: () => true,
  '1_3': (puntaje) => puntaje <= 3,
  '4_5': (puntaje) => puntaje >= 4,
})

const plazoDesde = (fecha) => new Date(new Date(fecha).getTime() + PLAZO_MS)
const redondear = (valor) => Math.round(valor * 10) / 10
const promedio = (valores) => (valores.length ? redondear(valores.reduce((a, b) => a + b, 0) / valores.length) : null)
// como getDisplayName del frontend: primer nombre y apellidos
const nombreCorto = (persona) => (persona ? `${persona.nombres.split(' ')[0]} ${persona.apellidos}`.trim() : 'Sin técnico')

const ticketNoEncontrado = () =>
  new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket tuyo con ese código.')

// solo quien reportó el ticket responde su encuesta; a los demás el ticket "no existe"
async function ticketPropio(codigo, usuario, t) {
  const ticket = await encuestasRepository.buscarTicket(codigo, t)
  if (!ticket || ticket.usuarioId !== usuario.id) throw ticketNoEncontrado()
  return ticket
}

// la encuesta como la ve quien la respondió, con su plazo de edición
function encuestaPublica(encuesta, codigoTicket, ahora) {
  const fechaLimiteEdicion = plazoDesde(encuesta.respondidaEn)
  return {
    id: encuesta.id,
    codigoTicket,
    puntajeGeneral: encuesta.puntaje,
    rapidez: encuesta.rapidez,
    trato: encuesta.trato,
    solucion: encuesta.solucion,
    comentario: encuesta.comentario,
    fechaRespuesta: encuesta.respondidaEn,
    editadaEn: encuesta.editadaEn ?? null,
    fechaLimiteEdicion,
    editable: ahora <= fechaLimiteEdicion.getTime(),
  }
}

function validarRespuesta({ puntajeGeneral, rapidez, trato, solucion, comentario = '' } = {}) {
  const errores = {}
  for (const [campo, valor] of Object.entries({ puntajeGeneral, rapidez, trato, solucion })) {
    if (!Number.isInteger(valor) || valor < 1 || valor > 5) errores[campo] = 'Califica del 1 al 5.'
  }
  if (typeof comentario !== 'string' || comentario.trim().length > COMENTARIO_MAXIMO) {
    errores.comentario = `El comentario admite hasta ${COMENTARIO_MAXIMO} caracteres.`
  }
  if (Object.keys(errores).length > 0) throw validationError(errores)
  return { puntaje: puntajeGeneral, rapidez, trato, solucion, comentario: comentario.trim() }
}

// La encuesta de un ticket propio, o null si todavía no la responde. abierta dice si hoy se puede responder o editar.
export async function obtenerEncuesta(codigo, usuario, ahora = Date.now()) {
  const ticket = await ticketPropio(codigo, usuario)
  const encuesta = await encuestasRepository.buscarDelTicket(ticket.id)
  if (encuesta) {
    const publica = encuestaPublica(encuesta, ticket.codigo, ahora)
    return { encuesta: publica, abierta: publica.editable, plazoHasta: publica.fechaLimiteEdicion }
  }
  const plazoHasta = ticket.cerradoEn ? plazoDesde(ticket.cerradoEn) : null
  return { encuesta: null, abierta: ticket.estado === 'cerrado' && ahora <= plazoHasta?.getTime(), plazoHasta }
}

// Crea la encuesta o, si ya existe, la edita. Devuelve { creada, encuesta }.
export async function responderEncuesta(codigo, datos, usuario, ahora = Date.now()) {
  try {
    return await enTransaccion(async (t) => {
      const ticket = await ticketPropio(codigo, usuario, t)
      if (ticket.estado !== 'cerrado') {
        throw new ServiceError(409, 'TICKET_NOT_CLOSED', 'Solo puedes calificar la atención de un ticket cerrado.')
      }
      const respuesta = validarRespuesta(datos)
      const fecha = new Date(ahora)
      const actual = await encuestasRepository.buscarDelTicket(ticket.id, t)
      if (actual) {
        if (ahora > plazoDesde(actual.respondidaEn).getTime()) {
          throw new ServiceError(409, 'SURVEY_EDIT_EXPIRED', 'El plazo de 7 días para editar esta encuesta venció.')
        }
        await encuestasRepository.actualizar(actual.id, { ...respuesta, editadaEn: fecha }, t)
        return { creada: false, encuesta: encuestaPublica({ ...actual, ...respuesta, editadaEn: fecha }, ticket.codigo, ahora) }
      }
      if (ahora > plazoDesde(ticket.cerradoEn).getTime()) {
        throw new ServiceError(409, 'SURVEY_EXPIRED', 'El plazo de 7 días para responder esta encuesta venció.')
      }
      const nueva = {
        id: await encuestasRepository.nuevoId(t),
        ticketId: ticket.id,
        usuarioId: usuario.id,
        ...respuesta,
        respondidaEn: fecha,
        editadaEn: null,
      }
      await encuestasRepository.insertar(nueva, t)
      return { creada: true, encuesta: encuestaPublica(nueva, ticket.codigo, ahora) }
    })
  } catch (error) {
    // otra pestaña la respondió al mismo tiempo: el ticket solo admite una
    if (esDuplicado(error)) {
      throw new ServiceError(409, 'SURVEY_ALREADY_ANSWERED', 'Ya respondiste esta encuesta. Actualiza la página para editarla.')
    }
    throw error
  }
}

// Mis encuestas (p28): las respondidas, con el promedio que dio la persona
export async function listarMisEncuestas(usuario, ahora = Date.now()) {
  const encuestas = await encuestasRepository.listarDeUsuario(usuario.id)
  const filas = encuestas.map((e) => ({
    ...encuestaPublica(e, e.ticket.codigo, ahora),
    asunto: e.ticket.asunto || 'Sin asunto',
    categoria: e.ticket.categoria?.nombre ?? null,
    tecnicoNombre: nombreCorto(e.ticket.tecnico),
  }))
  return {
    encuestas: filas,
    totalRespondidas: filas.length,
    promedioGeneral: promedio(filas.map((f) => f.puntajeGeneral)) ?? 0,
  }
}

function promedios(encuestas) {
  return {
    general: promedio(encuestas.map((e) => e.puntaje)),
    rapidez: promedio(encuestas.map((e) => e.rapidez)),
    trato: promedio(encuestas.map((e) => e.trato)),
    solucion: promedio(encuestas.map((e) => e.solucion)),
    encuestasCount: encuestas.length,
  }
}

function agruparPor(encuestas, clave) {
  const grupos = new Map()
  for (const encuesta of encuestas) {
    const valor = clave(encuesta)
    if (!valor) continue
    grupos.set(valor, [...(grupos.get(valor) ?? []), encuesta])
  }
  return grupos
}

// la categoría con más encuestas del técnico; si empatan, la primera en orden alfabético
function categoriaPrincipal(encuestas) {
  const conteo = agruparPor(encuestas, (e) => e.ticket.categoria?.nombre)
  const [primera] = [...conteo].sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b))
  return primera?.[0] ?? 'Sin categoría'
}

// Satisfacción del periodo por técnico y por categoría, con los comentarios filtrados por puntaje general. La tasa de
// respuesta es la parte de los tickets cerrados en el periodo que ya tienen encuesta.
export async function reporteSatisfaccion({ desde, hasta, puntaje = 'todos' } = {}) {
  const rango = validarPeriodo({ desde, hasta })
  const filtro = Object.hasOwn(FILTROS_DE_PUNTAJE, puntaje) ? FILTROS_DE_PUNTAJE[puntaje] : null
  if (!filtro) throw validationError({ puntaje: 'Elige todos, 1 a 3 o 4 a 5.' })
  const { inicio, fin } = instantesDelPeriodo(rango)
  const [respondidas, cerrados] = await Promise.all([
    encuestasRepository.listarRespondidasEntre(inicio, fin),
    encuestasRepository.listarCerradosEntre(inicio, fin),
  ])

  const tablaTecnicos = [...agruparPor(respondidas, (e) => e.ticket.asignadoA)]
    .map(([tecnicoId, encuestas]) => ({
      tecnicoId,
      tecnicoNombre: nombreCorto(encuestas[0].ticket.tecnico),
      categoriaPrincipal: categoriaPrincipal(encuestas),
      ...promedios(encuestas),
    }))
    .sort((a, b) => a.tecnicoNombre.localeCompare(b.tecnicoNombre))
  const porCategoria = [...agruparPor(respondidas, (e) => e.ticket.categoriaId)]
    .map(([categoriaId, encuestas]) => ({
      categoriaId,
      categoria: encuestas[0].ticket.categoria?.nombre ?? 'Sin categoría',
      ...promedios(encuestas),
    }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria))
  const { rapidez, trato, solucion } = promedios(respondidas)
  const comentarios = respondidas
    .filter((e) => e.comentario.trim() && filtro(e.puntaje))
    .map((e) => ({
      id: e.id,
      puntaje: e.puntaje,
      categoria: e.ticket.categoria?.nombre ?? 'Sin categoría',
      tecnicoNombre: nombreCorto(e.ticket.tecnico),
      fecha: e.respondidaEn,
      comentario: e.comentario,
    }))

  return {
    rango,
    totalRespondidas: respondidas.length,
    promedioGeneral: promedio(respondidas.map((e) => e.puntaje)) ?? 0,
    tasaRespuesta: cerrados.length ? Math.round((cerrados.filter((t) => t.encuesta).length / cerrados.length) * 100) : 0,
    promedioPorAspecto: { rapidez, trato, solucion },
    tablaTecnicos,
    porCategoria,
    comentarios,
  }
}
