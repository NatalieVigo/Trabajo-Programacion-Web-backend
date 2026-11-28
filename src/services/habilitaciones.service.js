import { enTransaccion } from '../repositories/RepositoryBase.js'
import { categoriasRepository } from '../repositories/categorias.repository.js'
import { habilitacionesRepository } from '../repositories/habilitaciones.repository.js'
import { usosCatalogoRepository } from '../repositories/usosCatalogo.repository.js'
import { getFullName } from '../utils/format.js'
import { ServiceError } from '../utils/ServiceError.js'
import { porNombre } from './catalogoComun.js'

const SIN_TICKETS = Object.freeze({ total: 0, enCurso: 0 })

const porNombreCompleto = (a, b) => getFullName(a).localeCompare(getFullName(b), 'es')

async function tecnicosActivos() {
  return (await usosCatalogoRepository.tecnicosActivos()).sort(porNombreCompleto)
}

// lee cuentas y tickets de otras historias, sin modificarlos
async function leerMatriz() {
  const [categorias, tecnicos, habilitaciones, ticketsPorCategoria, cargaPorTecnico] = await Promise.all([
    categoriasRepository.listar(),
    tecnicosActivos(),
    habilitacionesRepository.listar(),
    usosCatalogoRepository.ticketsPor('categoriaId'),
    usosCatalogoRepository.ticketsPor('asignadoA'),
  ])
  categorias.sort(porNombre)
  const orden = new Map(categorias.map((categoria, indice) => [categoria.id, indice]))
  const enOrden = (ids) => ids.filter((id) => orden.has(id)).sort((a, b) => orden.get(a) - orden.get(b))

  return {
    categorias: categorias.map(({ id, nombre, activa }) => ({
      id,
      nombre,
      activa,
      ticketsEnCurso: (ticketsPorCategoria.get(id) ?? SIN_TICKETS).enCurso,
    })),
    tecnicos: tecnicos.map((tecnico) => ({
      id: tecnico.id,
      nombres: tecnico.nombres,
      apellidos: tecnico.apellidos,
      especialidades: enOrden(tecnico.especialidades),
      carga: (cargaPorTecnico.get(tecnico.id) ?? SIN_TICKETS).enCurso,
      habilitadas: enOrden(
        habilitaciones.filter(({ tecnicoId }) => tecnicoId === tecnico.id).map(({ categoriaId }) => categoriaId),
      ),
    })),
  }
}

// Matriz de técnicos por categoría (p16), todo ordenado por nombre de categoría.
export function obtenerMatriz() {
  return leerMatriz()
}

// cambios es { tecnicoId: [categoriaIds] }; los técnicos que no vienen no se tocan
export async function guardarMatriz(cambios) {
  const [tecnicos, categorias] = await Promise.all([tecnicosActivos(), categoriasRepository.listar()])
  const tecnicoIds = new Set(tecnicos.map(({ id }) => id))
  const categoriaIds = new Set(categorias.map(({ id }) => id))
  const entradas = Object.entries(cambios ?? {})
  const valida = entradas.every(
    ([tecnicoId, ids]) => tecnicoIds.has(tecnicoId) && Array.isArray(ids) && ids.every((id) => categoriaIds.has(id)),
  )
  if (!valida) {
    throw new ServiceError(
      400,
      'VALIDATION_ERROR',
      'La matriz cambió mientras la editabas: hay técnicos o categorías que ya no están. Actualiza la página.',
    )
  }

  // todo o nada: si algo falla, ningún técnico queda a medias
  await enTransaccion(async (t) => {
    for (const [tecnicoId, ids] of entradas) {
      const deseadas = new Set(ids)
      const actuales = await habilitacionesRepository.listar({ tecnicoId }, t)
      for (const { id, categoriaId } of actuales) {
        if (!deseadas.has(categoriaId)) await habilitacionesRepository.eliminar(id, t)
      }
      const yaHabilitadas = new Set(actuales.map(({ categoriaId }) => categoriaId))
      for (const categoriaId of deseadas) {
        if (yaHabilitadas.has(categoriaId)) continue
        const id = await habilitacionesRepository.nuevoId(t)
        await habilitacionesRepository.insertar({ id, tecnicoId, categoriaId }, t)
      }
    }
  })
  return leerMatriz()
}
