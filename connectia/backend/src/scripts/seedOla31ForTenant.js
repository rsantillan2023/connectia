/**
 * Seed mínimo Ola 31 — supervisión comercial + caps/menú.
 * Uso: node src/scripts/seedOla31ForTenant.js [tenantCode]
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import {
  SupCadena,
  SupCliente,
  SupSala,
  SupClienteSala,
  SupTemplate,
  SupTarea,
} from '../models/Supervision.js'
import { ensureOla31MenuItems } from '../lib/ensureOla31Menu.js'
import { snapshotMediciones, TASK_STATUS, SUP_ROLE } from '../lib/supervisionTasks.js'

const code = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

const caps = new Set(tenant.capabilities || [])
caps.add('supervision.comercial')
caps.add('supervision.ecr')
tenant.capabilities = [...caps]
await tenant.save()
await ensureOla31MenuItems(tenant._id)

let cadena = await SupCadena.findOne({ tenantId: tenant._id, nombre: 'Cadena Demo' })
if (!cadena) {
  cadena = await SupCadena.create({ tenantId: tenant._id, nombre: 'Cadena Demo' })
}

let cliente = await SupCliente.findOne({ tenantId: tenant._id, nombre: 'Cliente Demo' })
if (!cliente) {
  cliente = await SupCliente.create({
    tenantId: tenant._id,
    nombre: 'Cliente Demo',
    codigo: 'CLI-01',
  })
}

let sala1 = await SupSala.findOne({ tenantId: tenant._id, nombre: 'Sala Centro' })
if (!sala1) {
  sala1 = await SupSala.create({
    tenantId: tenant._id,
    nombre: 'Sala Centro',
    codigo: 'S-01',
    cadenaId: cadena._id,
    comuna: 'Santiago',
  })
}
let sala2 = await SupSala.findOne({ tenantId: tenant._id, nombre: 'Sala Norte' })
if (!sala2) {
  sala2 = await SupSala.create({
    tenantId: tenant._id,
    nombre: 'Sala Norte',
    codigo: 'S-02',
    cadenaId: cadena._id,
    comuna: 'Huechuraba',
  })
}

let link = await SupClienteSala.findOne({
  tenantId: tenant._id,
  clienteId: cliente._id,
  salaId: sala1._id,
})
if (!link) {
  link = await SupClienteSala.create({
    tenantId: tenant._id,
    clienteId: cliente._id,
    salaId: sala1._id,
    colaboradores: [],
  })
}

const admin = await User.findOne({ tenantId: tenant._id, roles: 'admin' })
const member = await User.findOne({
  tenantId: tenant._id,
  roles: { $nin: ['admin', 'platform'] },
  activo: true,
})

if (admin) {
  admin.supervisionRole = SUP_ROLE.SUPERVISOR
  await admin.save()
}
if (member) {
  member.supervisionRole = SUP_ROLE.OPERARIO
  await member.save()
  const has = (link.colaboradores || []).some((c) => String(c.userId) === String(member._id))
  if (!has) {
    link.colaboradores.push({ userId: member._id, role: SUP_ROLE.OPERARIO })
    if (admin) link.colaboradores.push({ userId: admin._id, role: SUP_ROLE.SUPERVISOR })
    await link.save()
  }
}

let tpl = await SupTemplate.findOne({ tenantId: tenant._id, nombre: 'Checklist visita' })
if (!tpl) {
  tpl = await SupTemplate.create({
    tenantId: tenant._id,
    nombre: 'Checklist visita',
    descripcion: 'Plantilla demo Ola 31',
    mediciones: snapshotMediciones([
      { nombre: 'Check apertura', tipo: 'check' },
      { nombre: 'Check stock', tipo: 'check' },
      { nombre: 'Foto góndola', tipo: 'foto' },
    ]),
  })
}

const count = await SupTarea.countDocuments({ tenantId: tenant._id })
if (count < 2 && admin) {
  const snap = snapshotMediciones(tpl.mediciones)
  await SupTarea.create({
    tenantId: tenant._id,
    titulo: 'Visita Sala Centro',
    descripcion: 'Tarea demo desde plantilla',
    tipo: 'template',
    fechaLimite: new Date(Date.now() + 3 * 86400000),
    prioridad: 'alta',
    status: member ? TASK_STATUS.ASSIGNED : TASK_STATUS.PENDING,
    salaId: sala1._id,
    clienteId: cliente._id,
    creadorId: admin._id,
    asignadoId: member?._id || null,
    templateId: tpl._id,
    medicionesSnapshot: snap,
    respuestas: snap.map((m) => ({ key: m.key, completada: false })),
    requiereFoto: true,
    fechaAsignacion: member ? new Date() : null,
  })
  await SupTarea.create({
    tenantId: tenant._id,
    titulo: 'Revisión Sala Norte',
    descripcion: 'Tarea manual demo',
    tipo: 'manual',
    fechaLimite: new Date(Date.now() + 7 * 86400000),
    prioridad: 'media',
    status: TASK_STATUS.PENDING,
    salaId: sala2._id,
    creadorId: admin._id,
    requiereFoto: false,
  })
}

console.log('Ola 31 seed OK para', tenant.empCodigo)
await mongoose.disconnect()
