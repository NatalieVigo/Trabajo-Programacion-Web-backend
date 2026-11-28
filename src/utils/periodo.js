import { esFechaDeCalendario, finDelDiaEnLima } from './fechaLima.js'
import { validationError } from './ServiceError.js'

// El periodo de las métricas (HU-7) y de la satisfacción (HU-6) llega como ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD, en días
// de Lima. Si falta, la fecha no existe o el fin va antes del inicio, responde 400.
export function validarPeriodo({ desde, hasta } = {}) {
  if (!esFechaDeCalendario(desde) || !esFechaDeCalendario(hasta) || desde > hasta) {
    throw validationError({ periodo: 'Elige fechas válidas y una fecha final igual o posterior a la inicial.' })
  }
  return { desde, hasta }
}

// los instantes que cubre el periodo, del inicio del primer día al fin del último en Lima
export function instantesDelPeriodo({ desde, hasta }) {
  return { inicio: new Date(`${desde}T00:00:00.000-05:00`), fin: finDelDiaEnLima(hasta) }
}
