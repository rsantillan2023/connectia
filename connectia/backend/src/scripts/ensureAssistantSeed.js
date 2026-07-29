/**
 * Asegura menú Asistente + KB DEMO sin re-seed completo.
 * Uso: node src/scripts/ensureAssistantSeed.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { MenuItem } from '../models/MenuItem.js'
import { User } from '../models/User.js'
import { seedKbForTenant } from './seedKb.js'

await connectDB()

// Índice legacy sin partial filter choca con sourceId null
try {
  await mongoose.connection.collection('kbarticles').dropIndex('tenantId_1_sourceKind_1_sourceId_1')
  console.log('Dropped legacy kbarticles unique index')
} catch {
  /* ok si ya no existe o ya es el partial */
}

const tenants = await Tenant.find({ empCodigo: { $in: ['DEMO', 'ARCOR', 'THEFORK'] } })
for (const tenant of tenants) {
  await MenuItem.findOneAndUpdate(
    { tenantId: tenant._id, key: 'asistente' },
    {
      tenantId: tenant._id,
      key: 'asistente',
      label: 'Asistente',
      route: '/asistente',
      icon: 'sparkles',
      order: 58,
      channel: 'u',
      activo: true,
      audience: { roles: [], capabilities: [] },
    },
    { upsert: true },
  )
  await MenuItem.findOneAndUpdate(
    { tenantId: tenant._id, key: 'admin.kb' },
    {
      tenantId: tenant._id,
      key: 'admin.kb',
      label: 'Base de conocimientos',
      route: '/asistente-kb',
      icon: 'sparkles',
      order: 45.9,
      channel: 'a',
      activo: true,
      audience: { roles: [], capabilities: [] },
    },
    { upsert: true },
  )
  const kb = await seedKbForTenant(tenant)
  console.log(`${tenant.empCodigo}: menú OK · KB ${kb.created}/${kb.total}`)

  await User.updateMany(
    { tenantId: tenant._id, roles: { $in: ['admin', 'platform'] } },
    { $addToSet: { capabilities: 'admin.ia' } },
  )
  await User.updateMany(
    { tenantId: tenant._id, usuario: { $in: ['lucia', 'comunicacion', 'comms', 'rrhh.gestor', 'people.ops'] } },
    { $addToSet: { capabilities: 'admin.ia' } },
  )
}

await mongoose.disconnect()
console.log('ensureAssistantSeed OK')
