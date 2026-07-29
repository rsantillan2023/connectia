/**
 * Seed de Políticas corporativas para ARCOR.
 * Exportable: seedArcorPoliticas({ tenant, force })
 */
import { Policy } from '../models/Policy.js'
import { MenuItem } from '../models/MenuItem.js'
import { syncKbSource } from '../services/kbIndex.js'

const POL_MENU = [
  { key: 'politicas', label: 'Políticas', route: '/politicas', icon: 'shield', order: 46, channel: 'u' },
  {
    key: 'admin.politicas',
    label: 'Políticas y cumplimiento',
    route: '/politicas',
    icon: 'shield',
    order: 46.7,
    channel: 'a',
  },
]

const AUDIENCE = { mode: 'all', areaIds: [], groupIds: [], userIds: [] }

/**
 * @param {{ tenant: any, force?: boolean }} opts
 */
export async function seedArcorPoliticas({ tenant, force = true }) {
  const brand = tenant.nombre || 'Arcor'

  for (const item of POL_MENU) {
    await MenuItem.findOneAndUpdate(
      { tenantId: tenant._id, key: item.key },
      { ...item, tenantId: tenant._id, activo: true, audience: { roles: [], capabilities: [] } },
      { upsert: true, new: true },
    )
  }
  tenant.menuVersion = (tenant.menuVersion || 1) + 1
  await tenant.save()

  if (force) {
    const del = await Policy.deleteMany({ tenantId: tenant._id })
    console.log(`Limpieza políticas: ${del.deletedCount}`)
  } else {
    const n = await Policy.countDocuments({ tenantId: tenant._id })
    if (n > 0) return { policies: 0, skipped: true, existing: n }
  }

  const policies = await Policy.create([
    {
      tenantId: tenant._id,
      codigo: 'ETH-ARCOR-01',
      titulo: 'Código de ética y conducta',
      resumen: 'Principios de respeto, integridad y cuidado de la marca Arcor.',
      cuerpo:
        `Código de ética — ${brand}\n\n` +
        '1. Trato respetuoso a compañeros, contratistas y comunidades.\n' +
        '2. Integridad en decisiones comerciales y de planta.\n' +
        '3. Cero tolerancia al acoso, discriminación o represalias.\n' +
        '4. Uso responsable de la información y de los activos de la compañía.\n' +
        '5. Declarar conflictos de interés a People & Culture.\n\n' +
        'Al aceptar confirmás haber leído esta versión y te comprometés a cumplirla.',
      category: 'Ética',
      keywords: ['etica', 'conducta', 'respeto', 'integridad'],
      version: '1.0',
      status: 'published',
      requiresAck: true,
      mandatory: true,
      audience: AUDIENCE,
      authorName: 'Legal / People',
      publishedAt: new Date(),
      acks: [],
    },
    {
      tenantId: tenant._id,
      codigo: 'SEG-ARCOR-01',
      titulo: 'Seguridad industrial y EPP',
      resumen: 'Obligaciones de seguridad en planta (Arroyito, Córdoba y otras sedes).',
      cuerpo:
        `Seguridad industrial — ${brand}\n\n` +
        '1. Usá siempre el EPP indicado en tu puesto y línea.\n' +
        '2. Completá el checklist de bloqueo de energía cuando corresponda.\n' +
        '3. Reportá desvíos e incidentes de inmediato (Connectia → Mis solicitudes / Calidad).\n' +
        '4. No anules protecciones ni bypassees sistemas de seguridad.\n' +
        '5. Participá de los simulacros y capacitaciones obligatorias.\n\n' +
        'La seguridad es condición de trabajo. Al aceptar confirmás conocer estas reglas.',
      category: 'Seguridad',
      keywords: ['seguridad', 'epp', 'planta', 'incidente', 'arroyito'],
      version: '1.0',
      status: 'published',
      requiresAck: true,
      mandatory: true,
      audience: AUDIENCE,
      authorName: 'Seguridad industrial',
      publishedAt: new Date(),
      acks: [],
    },
    {
      tenantId: tenant._id,
      codigo: 'FS-ARCOR-01',
      titulo: 'Food safety e higiene',
      resumen: 'Buenas prácticas de inocuidad alimentaria en producción y empaque.',
      cuerpo:
        `Food safety — ${brand}\n\n` +
        '1. Cumplir higiene de manos, uniforme y zonas controladas.\n' +
        '2. Declarar síntomas o contacto con alérgenos según protocolo.\n' +
        '3. No ingresar alimentos, joyas ni dispositivos no autorizados a zona limpia.\n' +
        '4. Reportar no conformidades de producto o higiene por Connectia (Calidad).\n' +
        '5. Respetar trazabilidad de lotes y OP.\n\n' +
        'Al aceptar confirmás haber leído esta política de inocuidad.',
      category: 'Calidad',
      keywords: ['food safety', 'higiene', 'alérgenos', 'calidad', 'inocuidad'],
      version: '1.0',
      status: 'published',
      requiresAck: true,
      mandatory: true,
      audience: AUDIENCE,
      authorName: 'Calidad / Food Safety',
      publishedAt: new Date(),
      acks: [],
    },
    {
      tenantId: tenant._id,
      codigo: 'IT-ARCOR-01',
      titulo: 'Uso responsable de sistemas y Connectia',
      resumen: 'Credenciales, dispositivos, VPN y datos en la app interna.',
      cuerpo:
        `Uso de sistemas — ${brand}\n\n` +
        '1. No compartas usuario ni contraseña de Connectia, SAP, VPN u otros sistemas.\n' +
        '2. Bloqueá el dispositivo al alejarte del puesto.\n' +
        '3. Reportá incidentes de seguridad a IT (Mis solicitudes → Soporte sistemas).\n' +
        '4. No instales software no autorizado en notebooks corporativos.\n' +
        '5. La información de planta y comercial es confidencial.\n\n' +
        'Una nueva versión de esta política pedirá re-aceptación.',
      category: 'Seguridad de la información',
      keywords: ['it', 'password', 'vpn', 'connectia', 'datos'],
      version: '1.0',
      status: 'published',
      requiresAck: true,
      mandatory: false,
      audience: AUDIENCE,
      authorName: 'IT',
      publishedAt: new Date(),
      acks: [],
    },
    {
      tenantId: tenant._id,
      codigo: 'PRIV-ARCOR-01',
      titulo: 'Privacidad y datos personales',
      resumen: 'Tratamiento de datos de colaboradores en Connectia y legajo digital.',
      cuerpo:
        `Privacidad — ${brand}\n\n` +
        'People & Culture y áreas autorizadas tratan datos de legajo, solicitudes y acuses ' +
        'con fines laborales y de cumplimiento. No difundas datos de terceros. ' +
        'Para ejercer derechos de acceso o rectificación, abrí una consulta RRHH en Connectia.\n\n' +
        'Al aceptar confirmás haber leído esta política de privacidad interna.',
      category: 'Privacidad',
      keywords: ['privacidad', 'datos', 'legajo', 'gdpr', 'habeas data'],
      version: '1.0',
      status: 'published',
      requiresAck: true,
      mandatory: false,
      audience: AUDIENCE,
      authorName: 'Legal / People',
      publishedAt: new Date(),
      acks: [],
    },
    {
      tenantId: tenant._id,
      codigo: 'HO-ARCOR-01',
      titulo: 'Work from home / trabajo híbrido',
      resumen: 'Lineamientos para roles con modalidad híbrida o remota (áreas corporativas).',
      cuerpo:
        `Trabajo híbrido — ${brand}\n\n` +
        '1. Acordá con tu líder los días de oficina y disponibilidad.\n' +
        '2. Cumplir seguridad de la información también desde casa.\n' +
        '3. Registrar vacaciones y ausencias por Connectia.\n' +
        '4. Esta política no reemplaza convenios ni legislaciones locales.\n\n' +
        'Aplicable principalmente a roles de oficinas / corporativo.',
      category: 'People',
      keywords: ['home office', 'hibrido', 'remoto', 'people'],
      version: '1.0',
      status: 'published',
      requiresAck: true,
      mandatory: false,
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      acks: [],
    },
    {
      tenantId: tenant._id,
      codigo: 'BEN-ARCOR-01',
      titulo: 'Uso del programa de beneficios',
      resumen: 'Reglas del catálogo, puntos y canjes en Connectia.',
      cuerpo:
        `Beneficios — ${brand}\n\n` +
        '1. Los puntos y canjes son personales e intransferibles salvo indicación contraria.\n' +
        '2. El abuso o fraude en canjes puede implicar baja del beneficio y medidas disciplinarias.\n' +
        '3. Consultá el saldo y el catálogo en Herramientas → Beneficios.\n' +
        '4. People puede actualizar el catálogo sin aviso previo.\n\n' +
        'Al aceptar confirmás conocer las condiciones del programa.',
      category: 'Beneficios',
      keywords: ['beneficios', 'puntos', 'canje', 'billetera'],
      version: '1.0',
      status: 'published',
      requiresAck: true,
      mandatory: false,
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      acks: [],
    },
    {
      tenantId: tenant._id,
      codigo: 'COM-ARCOR-01',
      titulo: 'Comunicación interna y redes sociales',
      resumen: 'Uso del muro, chat y menciones públicas a la marca.',
      cuerpo:
        `Comunicación — ${brand}\n\n` +
        '1. El muro y el chat son canales laborales: cuidá el tono y la confidencialidad.\n' +
        '2. No publiques datos de producción, clientes o personas sin autorización.\n' +
        '3. En redes personales no hables en nombre de Arcor salvo rol de portavoz.\n' +
        '4. Reportá contenidos inadecuados a Comunicación o People.\n\n' +
        'Al aceptar confirmás estas pautas de comunicación.',
      category: 'Comunicación',
      keywords: ['muro', 'chat', 'redes', 'comunicacion', 'marca'],
      version: '1.0',
      status: 'published',
      requiresAck: true,
      mandatory: false,
      audience: AUDIENCE,
      authorName: 'Comunicación',
      publishedAt: new Date(),
      acks: [],
    },
  ])

  for (const p of policies) {
    await syncKbSource('policy', p)
    await p.save()
  }

  return { policies: policies.length, skipped: false }
}
