import mongoose from 'mongoose'

/**
 * Parámetros tipados por tenant (§27.03).
 * Secretos: solo se guarda referencia/masked; valor real no se expone en listados.
 */
const tenantParamSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true, trim: true },
    label: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    tipo: {
      type: String,
      enum: ['string', 'number', 'boolean', 'enum', 'json', 'secret'],
      default: 'string',
    },
    valor: { type: mongoose.Schema.Types.Mixed, default: null },
    valorPorDefecto: { type: mongoose.Schema.Types.Mixed, default: null },
    opciones: { type: [String], default: [] },
    sensible: { type: Boolean, default: false },
    grupo: { type: String, default: 'general' },
    orden: { type: Number, default: 100 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
)

tenantParamSchema.index({ tenantId: 1, key: 1 }, { unique: true })

export const TenantParam = mongoose.model('TenantParam', tenantParamSchema)

export const DEFAULT_TENANT_PARAMS = [
  {
    key: 'locale.default',
    label: 'Idioma por defecto',
    descripcion: 'Código BCP-47 para la app',
    tipo: 'string',
    valor: 'es-AR',
    valorPorDefecto: 'es-AR',
    grupo: 'locale',
    orden: 10,
  },
  {
    key: 'import.policy',
    label: 'Política de importación de usuarios',
    descripcion: 'partial = saltar filas con error; all_or_nothing = abortar lote',
    tipo: 'enum',
    valor: 'partial',
    valorPorDefecto: 'partial',
    opciones: ['partial', 'all_or_nothing'],
    grupo: 'usuarios',
    orden: 20,
  },
  {
    key: 'directory.google.enabled',
    label: 'Sync Google Workspace',
    descripcion: 'Habilitar canal adicional de import desde Google',
    tipo: 'boolean',
    valor: false,
    valorPorDefecto: false,
    grupo: 'directorio',
    orden: 30,
  },
  {
    key: 'directory.entra.enabled',
    label: 'Sync Microsoft Entra ID',
    descripcion: 'Habilitar canal adicional de import desde Entra',
    tipo: 'boolean',
    valor: false,
    valorPorDefecto: false,
    grupo: 'directorio',
    orden: 40,
  },
  {
    key: 'directory.on_remote_disable',
    label: 'Al baja en directorio externo',
    descripcion: 'Qué hacer si el usuario desaparece del IdP',
    tipo: 'enum',
    valor: 'deactivate',
    valorPorDefecto: 'deactivate',
    opciones: ['deactivate', 'notify_only', 'ignore'],
    grupo: 'directorio',
    orden: 50,
  },
  {
    key: 'calendar.outlook.enabled',
    label: 'Conectar Outlook / Microsoft 365',
    descripcion: 'Permite a cada usuario vincular su calendario Outlook y verlo/escribirlo en la agenda',
    tipo: 'boolean',
    valor: false,
    valorPorDefecto: false,
    grupo: 'calendario',
    orden: 60,
  },
  {
    key: 'calendar.google.enabled',
    label: 'Conectar Google Calendar',
    descripcion: 'Permite a cada usuario vincular Google Calendar y verlo/escribirlo en la agenda',
    tipo: 'boolean',
    valor: false,
    valorPorDefecto: false,
    grupo: 'calendario',
    orden: 70,
  },
]
