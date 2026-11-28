import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

// el JWT lleva el id del usuario, la versión de sesión de su cuenta (columna version_sesion) y cuándo vence
export function firmarToken({ usuarioId, version, venceEn }) {
  return jwt.sign({ uid: usuarioId, v: version, exp: Math.floor(venceEn.getTime() / 1000) }, config.jwtSecret)
}

// devuelve la sesión que dice el token, o null si es falso o venció
export function leerToken(token) {
  try {
    const { uid, v, exp } = jwt.verify(token, config.jwtSecret)
    if (!uid || !Number.isInteger(v)) return null
    return { usuarioId: uid, version: v, venceEn: new Date(exp * 1000) }
  } catch {
    return null
  }
}

// texto aleatorio para enlaces de recuperación e invitaciones
export function textoAleatorio(bytes = 16) {
  return randomBytes(bytes).toString('hex')
}
