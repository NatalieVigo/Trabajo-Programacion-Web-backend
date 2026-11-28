// Tiempos de atención, igual que en el frontend. Los estados llegan del más antiguo al más reciente.
// Cada etapa dura hasta el cambio siguiente; cerrado y cancelado no suman tiempo.
export function etapasDe(estados, ahora = Date.now()) {
  return estados.map((evento, indice) => {
    const desde = new Date(evento.creadoEn).getTime()
    const siguiente = estados[indice + 1]
    const hasta = siguiente ? new Date(siguiente.creadoEn).getTime() : ahora
    const cerrado = ['cerrado', 'cancelado'].includes(evento.estado)
    return { estado: evento.estado, ms: cerrado ? 0 : Math.max(hasta - desde, 0) }
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
