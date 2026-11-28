// Tiempos de atención, igual que en el frontend. Los estados llegan del más antiguo al más reciente.
// Cada etapa dura hasta el cambio siguiente; cerrado y cancelado no suman tiempo.
export function etapasDe(estados, ahora = Date.now()) {
  return estados.map((evento, indice) => {
    const desde = new Date(evento.creadoEn).getTime()
    const siguiente = estados[indice + 1]
    const hasta = siguiente ? new Date(siguiente.creadoEn).getTime() : ahora
    const cerrado = ['cerrado', 'cancelado'].includes(evento.estado)
    // enCurso: es el estado actual y todavía suma tiempo (lo muestra el historial de HU-5)
    return { estado: evento.estado, ms: cerrado ? 0 : Math.max(hasta - desde, 0), enCurso: !siguiente && !cerrado }
  })
}

// el tiempo de atención es el total sin las esperas
export function tiemposDe(estados, ahora = Date.now()) {
  const etapas = etapasDe(estados, ahora)
  const sumar = (seleccion) => seleccion.reduce((total, { ms }) => total + ms, 0)
  const totalMs = sumar(etapas)
  const enEsperaMs = sumar(etapas.filter(({ estado }) => estado === 'en_espera'))
  return { totalMs, enEsperaMs, atencionMs: totalMs - enEsperaMs }
}

// el cierre no va porque no acumula tiempo
const ORDEN_DE_ETAPAS = Object.freeze(['abierto', 'reabierto', 'en_atencion', 'en_espera', 'resuelto'])

// HU-5: suma todas las veces que el ticket pasó por cada estado
export function tiempoPorEstado(estados, ahora = Date.now()) {
  const etapas = etapasDe(estados, ahora)
  return ORDEN_DE_ETAPAS.filter((estado) => etapas.some((etapa) => etapa.estado === estado)).map((estado) => ({
    estado,
    ms: etapas.filter((etapa) => etapa.estado === estado).reduce((total, { ms }) => total + ms, 0),
  }))
}
