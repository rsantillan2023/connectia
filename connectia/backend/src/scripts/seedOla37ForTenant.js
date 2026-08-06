/**
 * Seed Ola 37 — Relevamientos de campo (add-on).
 * Uso: node src/scripts/seedOla37ForTenant.js [tenantCode]
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { FieldForm } from '../models/FieldForm.js'
import { FieldRoute } from '../models/FieldRoute.js'
import { FieldAssignment } from '../models/FieldAssignment.js'
import { activateOla37ForTenant } from '../lib/ensureOla37Menu.js'

const code = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

await activateOla37ForTenant(tenant)
console.log('Caps + menú Ola 37 OK:', tenant.empCodigo)

let form = await FieldForm.findOne({ tenantId: tenant._id, titulo: 'Relevamiento demo — visita' })
if (!form) {
  form = await FieldForm.create({
    tenantId: tenant._id,
    titulo: 'Relevamiento demo — visita',
    descripcion: 'Formulario de ejemplo Ola 37 (campo).',
    status: 'published',
    version: 1,
    publishedAt: new Date(),
    questions: [
      {
        id: 'q1',
        texto: '¿El punto está operativo?',
        tipo: 'yesno',
        required: true,
        opciones: [],
        grupo: 'General',
        logic: [],
      },
      {
        id: 'q2',
        texto: 'Describí el hallazgo',
        tipo: 'textarea',
        required: true,
        opciones: [],
        grupo: 'Detalle',
        logic: [
          {
            when: { questionId: 'q1', op: 'eq', value: false },
            action: 'require_if',
          },
        ],
      },
      {
        id: 'q3',
        texto: 'Foto de evidencia',
        tipo: 'multimedia',
        required: false,
        opciones: [],
        grupo: 'Evidencias',
        logic: [
          {
            when: { questionId: 'q1', op: 'eq', value: false },
            action: 'show',
          },
          {
            when: { questionId: 'q1', op: 'eq', value: true },
            action: 'hide',
          },
        ],
      },
      {
        id: 'q4',
        texto: 'Check-in en el punto',
        tipo: 'facility_checkin',
        required: false,
        opciones: [],
        grupo: 'Facility',
        logic: [],
      },
    ],
  })
  console.log('Formulario demo creado', form._id)
} else {
  console.log('Formulario demo ya existe')
}

let route = await FieldRoute.findOne({ tenantId: tenant._id, nombre: 'Ruta demo Centro' })
if (!route) {
  route = await FieldRoute.create({
    tenantId: tenant._id,
    nombre: 'Ruta demo Centro',
    descripcion: 'Dos paradas de ejemplo',
    activo: true,
    stops: [
      {
        id: 's1',
        label: 'Parada Norte',
        address: 'Av. Demo 100',
        lat: -34.6,
        lng: -58.38,
        radiusM: 150,
        order: 0,
        defaultFormId: form._id,
      },
      {
        id: 's2',
        label: 'Parada Sur',
        address: 'Av. Demo 200',
        lat: -34.61,
        lng: -58.39,
        radiusM: 150,
        order: 1,
        defaultFormId: form._id,
      },
    ],
  })
  console.log('Ruta demo creada', route._id)
}

const day = new Date().toISOString().slice(0, 10)
const operator =
  (await User.findOne({ tenantId: tenant._id, usuario: 'demo' })) ||
  (await User.findOne({ tenantId: tenant._id, activo: true }).sort({ createdAt: 1 }))

if (operator) {
  const existing = await FieldAssignment.findOne({
    tenantId: tenant._id,
    day,
    operatorId: operator._id,
    formId: form._id,
    stopId: 's1',
  })
  if (!existing) {
    await FieldAssignment.create({
      tenantId: tenant._id,
      day,
      operatorId: operator._id,
      formId: form._id,
      formVersion: form.version || 1,
      formSnapshot: {
        titulo: form.titulo,
        questions: form.questions,
        version: form.version || 1,
      },
      routeId: route._id,
      stopId: 's1',
      stopLabel: 'Parada Norte',
      modality: 'on_route',
      status: 'pending',
      order: 0,
      createdBy: operator._id,
    })
    await FieldAssignment.create({
      tenantId: tenant._id,
      day,
      operatorId: operator._id,
      formId: form._id,
      formVersion: form.version || 1,
      formSnapshot: {
        titulo: form.titulo,
        questions: form.questions,
        version: form.version || 1,
      },
      routeId: route._id,
      stopId: 's2',
      stopLabel: 'Parada Sur',
      modality: 'on_route',
      status: 'pending',
      order: 1,
      createdBy: operator._id,
    })
    console.log('Asignaciones de hoy para', operator.usuario || operator.nombre)
  } else {
    console.log('Asignaciones de hoy ya existen')
  }
} else {
  console.warn('Sin usuario operador para asignar')
}

console.log('Ola 37 seed listo')
process.exit(0)
