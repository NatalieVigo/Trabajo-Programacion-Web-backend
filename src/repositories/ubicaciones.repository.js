import { RepositoryBase, db } from './RepositoryBase.js'

// HU-2: sedes, pabellones y ambientes (p14 y p15). t es la transacción opcional (ver RepositoryBase).
const sedes = new RepositoryBase(db.sede)
const pabellones = new RepositoryBase(db.pabellon)
const ambientes = new RepositoryBase(db.ambiente)

const CAMPOS_AMBIENTE = ['codigo', 'nombre', 'tipo', 'pabellonId', 'piso', 'capacidad']

// solo los campos de la tabla, aunque el objeto traiga otros
const soloCampos = (datos, campos) => Object.fromEntries(campos.map((campo) => [campo, datos[campo]]))

const POR_ID = [['id', 'ASC']]

export const sedesRepository = {
  listar(t) {
    return sedes.listar({ order: POR_ID }, t)
  },

  buscar(id, t) {
    return sedes.buscarPorId(id, t)
  },

  async insertar({ id, nombre }, t) {
    await sedes.crear({ id, nombre }, t)
  },

  async actualizar(id, { nombre }, t) {
    await sedes.actualizar({ id }, { nombre }, t)
  },

  async eliminar(id, t) {
    await sedes.eliminar({ id }, t)
  },

  // ids del contrato de datos, como 'sed-02'
  nuevoId(t) {
    return sedes.siguienteId('sed', t, 2)
  },
}

export const pabellonesRepository = {
  listar({ sedeId } = {}, t) {
    return pabellones.listar({ where: sedeId ? { sedeId } : {}, order: POR_ID }, t)
  },

  buscar(id, t) {
    return pabellones.buscarPorId(id, t)
  },

  async insertar({ id, sedeId, nombre }, t) {
    await pabellones.crear({ id, sedeId, nombre }, t)
  },

  async actualizar(id, { sedeId, nombre }, t) {
    await pabellones.actualizar({ id }, { sedeId, nombre }, t)
  },

  async eliminar(id, t) {
    await pabellones.eliminar({ id }, t)
  },

  // como 'pab-10'
  nuevoId(t) {
    return pabellones.siguienteId('pab', t, 2)
  },
}

export const ambientesRepository = {
  listar({ pabellonId } = {}, t) {
    return ambientes.listar({ where: pabellonId ? { pabellonId } : {}, order: POR_ID }, t)
  },

  buscar(id, t) {
    return ambientes.buscarPorId(id, t)
  },

  async insertar(ambiente, t) {
    await ambientes.crear(soloCampos(ambiente, ['id', ...CAMPOS_AMBIENTE]), t)
  },

  async actualizar(id, campos, t) {
    await ambientes.actualizar({ id }, soloCampos(campos, CAMPOS_AMBIENTE), t)
  },

  async eliminar(id, t) {
    await ambientes.eliminar({ id }, t)
  },

  // como 'amb-12'
  nuevoId(t) {
    return ambientes.siguienteId('amb', t, 2)
  },
}
