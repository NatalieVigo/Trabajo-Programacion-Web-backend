import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

// el JWT lleva el id de la sesión, el de su usuario y la versión de sus sesiones (ver sesiones.repository.js)
export function firmarToken({ id, usuarioId, version, venceEn }) {
  return jwt.sign({ sid: id, uid: usuarioId, v: version, exp: Math.floor(venceEn.getTime() / 1000) }, config.jwtSecret)
}

// devuelve la sesión que dice el token, o null si es falso o venció
export function leerToken(token) {
  try {
    const { sid, uid, v, exp } = jwt.verify(token, config.jwtSecret)
    if (!sid || !uid || !Number.isInteger(v)) return null
    return { id: sid, usuarioId: uid, version: v, venceEn: new Date(exp * 1000) }
  } catch {
    return null
  }
}

// texto aleatorio para sesiones, enlaces de recuperación e invitaciones
export function textoAleatorio(bytes = 16) {
  return randomBytes(bytes).toString('hex')
}
