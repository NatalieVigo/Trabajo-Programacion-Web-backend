// Configuración de la API desde variables de entorno; el repositorio no guarda credenciales (enunciado §7).
// La de la base de datos está en src/db/config/database.js.

function requerida(nombre) {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Copia .env.example como .env y complétalo.`)
  return valor
}

export const config = Object.freeze({
  puerto: Number(process.env.PORT ?? 3000),
  origenFrontend: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: requerida('JWT_SECRET'),
  correosSimulados: process.env.CORREOS_SIMULADOS === 'true',
})
