// Estados del ticket y a cuáles puede pasar cada uno (HU-5), igual que en el frontend.
export const ESTADOS = Object.freeze([
  'abierto',
  'en_atencion',
  'en_espera',
  'resuelto',
  'cerrado',
  'reabierto',
  'cancelado',
])

export const ETIQUETAS_ESTADO = Object.freeze({
  abierto: 'Abierto',
  en_atencion: 'En atención',
  en_espera: 'En espera',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  reabierto: 'Reabierto',
  cancelado: 'Cancelado',
})

// a cerrado no se pasa con un cambio de estado, se llega cerrando el ticket con su solución
export const TRANSICIONES = Object.freeze({
  abierto: Object.freeze(['en_atencion']),
  reabierto: Object.freeze(['en_atencion']),
  en_atencion: Object.freeze(['en_espera', 'resuelto']),
  en_espera: Object.freeze(['en_atencion', 'resuelto']),
  resuelto: Object.freeze(['en_atencion']),
  cerrado: Object.freeze([]),
  cancelado: Object.freeze([]),
})

// mismo criterio que los tickets "abiertos" de HU-1
export const ESTADOS_EN_CURSO = Object.freeze(['abierto', 'en_atencion', 'en_espera', 'reabierto'])

export const ESTADOS_QUE_SE_CIERRAN = Object.freeze(['en_atencion', 'resuelto'])

const SIN_TRANSICIONES = Object.freeze([])

export function formatEstado(estado) {
  return ETIQUETAS_ESTADO[estado] ?? estado
}

export function transicionesDesde(estado) {
  return Object.hasOwn(TRANSICIONES, estado) ? TRANSICIONES[estado] : SIN_TRANSICIONES
}

export function esTransicionValida(desde, hacia) {
  return transicionesDesde(desde).includes(hacia)
}

export function sePuedeCerrar(estado) {
  return ESTADOS_QUE_SE_CIERRAN.includes(estado)
}
