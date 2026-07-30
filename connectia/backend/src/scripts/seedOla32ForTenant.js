/**
 * Seed mínimo Ola 32 — cap + menú + 1 TeamScope DEMO.
 * Uso: node src/scripts/seedOla32ForTenant.js DEMO
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { TeamScope } from '../models/TeamScope.js'
import { ensureOla32MenuItems } from '../lib/ensureOla32Menu.js'
import { refreshTeamScope, TEAM_MODULES } from '../lib/teamScope.js'

const code = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

const caps = new Set(tenant.capabilities || [])
caps.add('supervision.equipo')
for (const m of TEAM_MODULES) caps.add(`supervision.equipo.${m}`)
caps.add('admin.equipos')
tenant.capabilities = [...caps]
await tenant.save()
await ensureOla32MenuItems(tenant._id)

const supervisor =
  (await User.findOne({ tenantId: tenant._id, roles: 'admin', activo: true })) ||
  (await User.findOne({ tenantId: tenant._id, activo: true }).sort({ createdAt: 1 }))
if (!supervisor) {
  console.error('Sin usuarios en tenant')
  process.exit(1)
}

const members = await User.find({
  tenantId: tenant._id,
  activo: true,
  _id: { $ne: supervisor._id },
})
  .limit(5)
  .select('_id')
  .lean()

let scope = await TeamScope.findOne({ tenantId: tenant._id, nombre: 'Equipo DEMO' })
if (!scope) {
  scope = await TeamScope.create({
    tenantId: tenant._id,
    supervisorId: supervisor._id,
    nombre: 'Equipo DEMO',
    source: { userIds: members.map((m) => m._id) },
    allowedModules: [...TEAM_MODULES],
    createdById: supervisor._id,
  })
} else {
  scope.source = {
    userIds: members.map((m) => m._id),
    areaIds: [],
    groupIds: [],
    clientIds: [],
    areaClientIntersect: false,
  }
  scope.supervisorId = supervisor._id
  scope.allowedModules = [...TEAM_MODULES]
  scope.activo = true
}
await refreshTeamScope(scope)

console.log(
  JSON.stringify(
    {
      ok: true,
      tenant: code,
      supervisorId: String(supervisor._id),
      scopeId: String(scope._id),
      memberCount: scope.memberCount,
    },
    null,
    2,
  ),
)
await mongoose.disconnect()
