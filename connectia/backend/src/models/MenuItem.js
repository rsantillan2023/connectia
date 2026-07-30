import mongoose from 'mongoose'

const menuItemSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    route: { type: String, required: true },
    icon: { type: String, default: 'circle' },
    order: { type: Number, default: 100 },
    audience: {
      roles: { type: [String], default: [] },
      capabilities: { type: [String], default: [] },
    },
    channel: { type: String, enum: ['u', 'a', 'both'], default: 'u' },
    activo: { type: Boolean, default: true },
    /** Si true, aparece en la botonera inferior de la app U (Ola 3 · 04.16). */
    showInTabbar: { type: Boolean, default: false },
    /** Orden dentro de la tabbar (menor = más a la izquierda). */
    tabOrder: { type: Number, default: 100 },
    /** Canal admin: también en el sidebar derecho del MainLayout. */
    showInAdminSidebar: { type: Boolean, default: false },
    /** Canal admin: también en el menú superior (quick links). */
    showInAdminHeader: { type: Boolean, default: false },
    /**
     * Acción al tocar (Ola 3 · 04.04).
     * navigate = ir a route (default); compose_post = abrir composer UGC con params.
     */
    actionType: {
      type: String,
      enum: ['navigate', 'compose_post'],
      default: 'navigate',
    },
    /** Params de acción: { tipo, categoryId, section, isKnowledge } */
    actionParams: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

menuItemSchema.index({ tenantId: 1, key: 1 }, { unique: true })

export const MenuItem = mongoose.model('MenuItem', menuItemSchema)
