import mongoose from 'mongoose'

/**
 * Legajo RRHH autónomo en Connectia (§14 local).
 * Un miembro de la comunidad (User) puede o no tener legajo.
 * Un legajo puede existir sin User (ingreso pendiente de cuenta).
 */

const domicilioSchema = new mongoose.Schema(
  {
    tipo: { type: String, default: 'particular', maxlength: 40 },
    calle: { type: String, default: '', maxlength: 200 },
    numero: { type: String, default: '', maxlength: 40 },
    pisoDepto: { type: String, default: '', maxlength: 40 },
    localidad: { type: String, default: '', maxlength: 120 },
    provincia: { type: String, default: '', maxlength: 120 },
    pais: { type: String, default: 'AR', maxlength: 80 },
    cp: { type: String, default: '', maxlength: 20 },
    principal: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },
  },
  { _id: true },
)

const familiarSchema = new mongoose.Schema(
  {
    parentesco: { type: String, default: '', maxlength: 60 },
    nombre: { type: String, default: '', maxlength: 120 },
    apellido: { type: String, default: '', maxlength: 120 },
    dni: { type: String, default: '', maxlength: 32 },
    fechaNacimiento: { type: Date, default: null },
    activo: { type: Boolean, default: true },
  },
  { _id: true },
)

const cuentaBancariaSchema = new mongoose.Schema(
  {
    banco: { type: String, default: '', maxlength: 120 },
    tipoCuenta: { type: String, default: 'sueldo', maxlength: 40 },
    cbu: { type: String, default: '', maxlength: 32 },
    alias: { type: String, default: '', maxlength: 80 },
    titular: { type: String, default: '', maxlength: 160 },
    principal: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },
  },
  { _id: true },
)

const contratoSchema = new mongoose.Schema(
  {
    tipo: { type: String, default: '', maxlength: 80 },
    numero: { type: String, default: '', maxlength: 80 },
    fechaInicio: { type: Date, default: null },
    fechaFin: { type: Date, default: null },
    modalidad: { type: String, default: '', maxlength: 80 },
    observaciones: { type: String, default: '', maxlength: 500 },
    activo: { type: Boolean, default: true },
  },
  { _id: true },
)

const capacitacionSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: '', maxlength: 200 },
    institucion: { type: String, default: '', maxlength: 160 },
    fecha: { type: Date, default: null },
    horas: { type: Number, default: null },
    certificado: { type: String, default: '', maxlength: 300 },
  },
  { _id: true },
)

const skillSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: '', maxlength: 120 },
    nivel: { type: String, default: '', maxlength: 40 },
  },
  { _id: true },
)

const employeeLegajoSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** Miembro de comunidad vinculado (opcional). */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    numeroLegajo: { type: String, required: true, trim: true, maxlength: 64 },
    /** pre_ingreso | activo | licencia | baja */
    estadoLaboral: {
      type: String,
      enum: ['pre_ingreso', 'activo', 'licencia', 'baja'],
      default: 'activo',
      index: true,
    },
    activo: { type: Boolean, default: true, index: true },

    nombre: { type: String, default: '', maxlength: 120 },
    apellido: { type: String, default: '', maxlength: 120 },
    email: { type: String, default: '', maxlength: 200 },
    telefono: { type: String, default: '', maxlength: 40 },
    dni: { type: String, default: '', maxlength: 32, index: true },
    cuil: { type: String, default: '', maxlength: 32, index: true },
    genero: { type: String, default: '', maxlength: 40 },
    nacionalidad: { type: String, default: '', maxlength: 80 },
    estadoCivil: { type: String, default: '', maxlength: 40 },
    fechaNacimiento: { type: Date, default: null },
    fechaIngreso: { type: Date, default: null },
    fechaEgreso: { type: Date, default: null },

    cargo: { type: String, default: '', maxlength: 120 },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgArea', default: null },
    liderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    clasificacion: { type: String, default: '', maxlength: 80 },
    subestado: { type: String, default: '', maxlength: 80 },

    domicilios: { type: [domicilioSchema], default: [] },
    familiares: { type: [familiarSchema], default: [] },
    obraSocial: {
      nombre: { type: String, default: '', maxlength: 160 },
      numeroAfiliado: { type: String, default: '', maxlength: 80 },
      plan: { type: String, default: '', maxlength: 80 },
      vigentesDesde: { type: Date, default: null },
    },
    datosBancarios: { type: [cuentaBancariaSchema], default: [] },
    fichaMedica: {
      grupoSanguineo: { type: String, default: '', maxlength: 16 },
      alergias: { type: String, default: '', maxlength: 500 },
      observaciones: { type: String, default: '', maxlength: 1000 },
      contactoEmergenciaNombre: { type: String, default: '', maxlength: 160 },
      contactoEmergenciaTel: { type: String, default: '', maxlength: 40 },
    },
    contratos: { type: [contratoSchema], default: [] },
    carrera: {
      capacitaciones: { type: [capacitacionSchema], default: [] },
      skills: { type: [skillSchema], default: [] },
    },

    notasInternas: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true },
)

employeeLegajoSchema.index({ tenantId: 1, numeroLegajo: 1 }, { unique: true })
employeeLegajoSchema.index(
  { tenantId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } },
)

export const EmployeeLegajo = mongoose.model('EmployeeLegajo', employeeLegajoSchema)
