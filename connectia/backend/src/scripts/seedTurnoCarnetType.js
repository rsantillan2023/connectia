/**
 * Upsert tipo de solicitud `turno_carnet` (ex-gap 32.03) en un tenant.
 * Uso: node src/scripts/seedTurnoCarnetType.js [EMP_CODIGO]
 * Default: DEMO
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { Tenant } from '../models/Tenant.js'
import { RequestType } from '../models/RequestType.js'

const emp = String(process.argv[2] || 'DEMO').toUpperCase()

const TYPE = {
  key: 'turno_carnet',
  nombre: 'Turno carnet',
  descripcion: 'Pedido de turno para tramitar carnet / credencial (ex-gap 32.03).',
  area: 'RRHH',
  orden: 50,
  activo: true,
  audience: { mode: 'all', areaIds: [], groupIds: [] },
  campos: [
    {
      key: 'tipo_carnet',
      label: 'Tipo de carnet',
      tipo: 'select',
      required: true,
      orden: 10,
      opciones: ['Credencial de acceso', 'Carnet de identificación', 'Otro'],
    },
    { key: 'fecha_preferida', label: 'Fecha preferida', tipo: 'date', required: true, orden: 20 },
    {
      key: 'franja',
      label: 'Franja horaria',
      tipo: 'select',
      required: true,
      orden: 30,
      opciones: ['Mañana', 'Tarde', 'Indistinto'],
    },
    {
      key: 'motivo',
      label: 'Motivo',
      tipo: 'textarea',
      required: true,
      orden: 40,
      placeholder: 'Alta, renovación, extravío…',
    },
  ],
}

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectia'
await mongoose.connect(uri)
const tenant = await Tenant.findOne({ empCodigo: emp, activo: true })
if (!tenant) {
  console.error(`Tenant ${emp} no encontrado`)
  process.exit(1)
}
const doc = await RequestType.findOneAndUpdate(
  { tenantId: tenant._id, key: TYPE.key },
  { ...TYPE, tenantId: tenant._id },
  { upsert: true, new: true },
)
console.log(`OK ${emp}: tipo ${doc.key} · ${doc.nombre} · id=${doc._id}`)
await mongoose.disconnect()
