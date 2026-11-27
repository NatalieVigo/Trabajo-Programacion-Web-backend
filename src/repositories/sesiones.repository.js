// Las sesiones no se guardan en la base: el seed no tiene una tabla de sesiones y el token firmado ya dice de quién es
// y cuándo vence. Aquí solo se recuerdan, en memoria, las sesiones que se cerraron antes de vencer.
// Si el servidor se reinicia, esta memoria se pierde y un token cerrado vuelve a servir hasta que vence.

// id de la sesión → fecha en que vence; pasada esa fecha el token ya no sirve y se puede olvidar
const cerradas = new Map()
// id del usuario → cuántas veces se cerraron todas sus sesiones (al restablecer la contraseña)
const versiones = new Map()

const versionDe = (usuarioId) => versiones.get(usuarioId) ?? 0

function olvidarVencidas(ahora) {
  for (const [id, venceEn] of cerradas) if (venceEn <= ahora) cerradas.delete(id)
}

export const sesionesRepository = {
  // la sesión nueva lleva la versión actual del usuario; el token la guarda
  crear({ id, usuarioId, venceEn }) {
    return { id, usuarioId, version: versionDe(usuarioId), venceEn }
  },

  // solo cuenta si no se cerró ni se cerraron después todas las sesiones de su usuario
  buscarVigente({ id, usuarioId, version, venceEn }, ahora) {
    if (venceEn <= ahora || cerradas.has(id) || version < versionDe(usuarioId)) return null
    return { id, usuarioId, venceEn }
  },

  cerrar({ id, venceEn }, ahora) {
    olvidarVencidas(ahora)
    cerradas.set(id, venceEn)
  },

  cerrarTodas(usuarioId) {
    versiones.set(usuarioId, versionDe(usuarioId) + 1)
  },
}
