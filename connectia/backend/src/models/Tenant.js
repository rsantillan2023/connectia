import mongoose from 'mongoose'

const tenantSchema = new mongoose.Schema(
  {
    empCodigo: { type: String, required: true, unique: true, index: true },
    nombre: { type: String, required: true },
    activo: { type: Boolean, default: true },
    allowDesktop: { type: Boolean, default: true },
    branding: {
      primary: { type: String, default: '#0F766E' },
      secondary: { type: String, default: '#134E4A' },
      logoUrl: { type: String, default: '' },
      /** Fondo login (URL); vacío = gradiente default */
      loginBgUrl: { type: String, default: '' },
      /** @deprecated preferir branding.splash.* — se mantienen por compat */
      splashTitle: { type: String, default: '' },
      splashSubtitle: { type: String, default: '' },
      splashDurationSec: { type: Number, default: 2, min: 0, max: 30 },
      /** Configuración detallada del splash de marca (por tenant) */
      splash: {
        enabledPreLogin: { type: Boolean, default: true },
        enabledPostLogin: { type: Boolean, default: true },
        durationSec: { type: Number, default: 2, min: 0, max: 30 },
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        logoUrl: { type: String, default: '' },
        bgColor: { type: String, default: '' },
        bgImageUrl: { type: String, default: '' },
        textColor: { type: String, default: '' },
        showLogo: { type: Boolean, default: true },
        showTitle: { type: Boolean, default: true },
        showSubtitle: { type: Boolean, default: true },
      },
      /**
       * Oscuridad del botón «Hola {nombre}» / puntos del muro vs color del header.
       * 0 = mismo color que el header; 100 = negro. Default ~22.
       */
      pointsBtnDarkenPct: { type: Number, default: 22, min: 0, max: 80 },
    },
    /** light | dark | system — política de tema (§2 branding) */
    themeMode: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    /** connectia | modern | legacy — ADR-GAPS (reemplaza YOMOB/SOOFIA) */
    uxShell: { type: String, enum: ['connectia', 'modern', 'legacy'], default: 'connectia' },
    /**
     * Home de la app U (Ola 36-h): classic = muro actual; genz = HomeAlt opt-in.
     * No modifica MuroView; solo cambia la ruta de entrada.
     */
    homeVariant: { type: String, enum: ['classic', 'genz'], default: 'classic' },
    /** Idioma / modismo de interfaz (Ola 36-o). es-AR default; es-CL = chileno. */
    uiLocale: { type: String, enum: ['es-AR', 'es-CL'], default: 'es-AR' },
    pointsApiKey: { type: String, default: '' },
    loginMethods: { type: [String], default: ['password'] },
    /**
     * Auth extendida §1: SSO dominios, 2FA obligatorio, secreto legacy.
     * { allowedEmailDomains[], twoFactorRequired, twoFactorMethods[],
     *   ssoAutoProvision, legacySharedSecret }
     */
    authConfig: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /** Módulos activos hoy (subset de lo contratado cuando hay candado). */
    capabilities: { type: [String], default: [] },
    /**
     * Ola 35: módulos contratados por PLATFORM (entitlements).
     * Vacío = sin candado (tenants legacy / precandado).
     * El admin de comunidad solo puede activar ids ⊆ licensedCapabilities.
     */
    licensedCapabilities: { type: [String], default: [] },
    timezone: { type: String, default: 'America/Argentina/Buenos_Aires' },
    /** Bump al mutar menú → clientes invalidan caché */
    menuVersion: { type: Number, default: 1 },
    /**
     * Workflow de solicitudes (§9): estados activos, transiciones y cierre.
     * Se normaliza en runtime con defaultSolicitudesConfig().
     */
    solicitudesConfig: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /**
     * Formato y elementos visibles por tipo de publicación (§4 muro).
     * Se normaliza en runtime con defaultPostsConfig().
     */
    postsConfig: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /**
     * Publicaciones de colaboradores (UGC) con moderación admin.
     * enabled=false → la app no muestra el composer.
     * requireApproval=true → quedan en pending_review hasta aprobar.
     */
    ugc: {
      enabled: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: true },
    },
    /**
     * Moderación de comentarios §10 (IA sugiere; humano confirma).
     * Se normaliza con normalizeCommentsModeration().
     */
    commentsModeration: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /**
     * Políticas de chat §8 (retención, grupos, adjuntos).
     * Se normaliza en runtime con normalizeChatConfig().
     */
    chatConfig: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /**
     * Bandeja externa de documentos: origen (URL/S3/Drive) + patrón de nombre
     * que relaciona archivos con un usuario (DNI/CUIL/legajo/…).
     */
    docsDrop: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /**
     * Expediente RRHH en perfil (§3.08 / §14 local).
     * enabled=false → no se muestra sección (perfil sigue OK).
     * Datos en EmployeeLegajo (sin API externa).
     */
    peopleCare: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /**
     * Licencias / vacaciones (§12 · §13): legislación AR o CL, conteo de días, antigüedad.
     * Se normaliza con normalizeLicenciasConfig().
     */
    licenciasConfig: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /**
     * Beneficios §18: nombres visibles de tipología por comunidad.
     * { offerTypes: { informativo: { label, hint }, canjeable: …, … } }
     */
    benefitsConfig: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /**
     * Encuestas: categorías editables + tipos de pregunta habilitados.
     * Se normaliza con normalizeSurveysConfig().
     * { categories: [{ id, label }], enabledQuestionTypes: string[] }
     */
    surveysConfig: { type: mongoose.Schema.Types.Mixed, default: undefined },
    /**
     * Resumen de onboarding / seed al alta (plataforma).
     * Guarda perfil IA, accesos demo y mensaje listo para enviar al cliente.
     */
    onboarding: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true },
)

export const Tenant = mongoose.model('Tenant', tenantSchema)
