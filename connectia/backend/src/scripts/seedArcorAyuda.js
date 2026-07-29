/**
 * Seed de Ayuda (FAQs) + Tutoriales para ARCOR.
 * Exportable: seedArcorAyuda({ tenant, force })
 */
import { Faq } from '../models/Faq.js'
import { Tutorial } from '../models/Tutorial.js'
import { MenuItem } from '../models/MenuItem.js'
import { syncKbSource } from '../services/kbIndex.js'

const HELP_MENU = [
  { key: 'ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help', order: 45, channel: 'u' },
  { key: 'admin.ayuda', label: 'Ayuda', route: '/ayuda', icon: 'help', order: 46.5, channel: 'a' },
]

const AUDIENCE = { mode: 'all', areaIds: [], groupIds: [], userIds: [] }

/**
 * @param {{ tenant: any, force?: boolean }} opts
 */
export async function seedArcorAyuda({ tenant, force = true }) {
  const brand = tenant.nombre || 'Arcor'

  for (const item of HELP_MENU) {
    await MenuItem.findOneAndUpdate(
      { tenantId: tenant._id, key: item.key },
      { ...item, tenantId: tenant._id, activo: true, audience: { roles: [], capabilities: [] } },
      { upsert: true, new: true },
    )
  }
  tenant.menuVersion = (tenant.menuVersion || 1) + 1
  await tenant.save()

  if (force) {
    const delF = await Faq.deleteMany({ tenantId: tenant._id })
    const delT = await Tutorial.deleteMany({ tenantId: tenant._id })
    console.log(`Limpieza ayuda: FAQs ${delF.deletedCount} · tutoriales ${delT.deletedCount}`)
  } else {
    const faqN = await Faq.countDocuments({ tenantId: tenant._id })
    const tutN = await Tutorial.countDocuments({ tenantId: tenant._id })
    if (faqN > 0 && tutN > 0) {
      return { faqs: 0, tutorials: 0, skipped: true, faqN, tutN }
    }
  }

  const faqs = await Faq.create([
    {
      tenantId: tenant._id,
      category: 'Connectia',
      pregunta: '¿Cómo empiezo a usar Connectia en Arcor?',
      respuesta:
        'Abrí el Menú (abajo a la derecha). Ahí están Muro, Procesos (solicitudes y aprobaciones), Licencias y ausencias, Herramientas y Ayuda. En Home ves novedades de planta y de People & Culture.',
      keywords: ['inicio', 'menu', 'connectia', 'arcor', 'primeros pasos'],
      orden: 10,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'RRHH',
      pregunta: '¿Cómo pido vacaciones o un permiso?',
      respuesta:
        'Menú → Licencias y ausencias → Vacaciones. Elegí el tipo, las fechas y enviá. También podés ir a Procesos → Mis solicitudes si el trámite es una consulta a People. El estado se actualiza en la misma pantalla y en Aprobaciones → Mis pedidos.',
      keywords: ['vacaciones', 'permiso', 'licencia', 'rrhh', 'people'],
      orden: 20,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'RRHH',
      pregunta: '¿Cómo registro una ausencia?',
      respuesta:
        'Menú → Licencias y ausencias → Ausencias. Indicá el tipo, el período y el motivo. Si hace falta certificado, adjuntá la imagen. RRHH verá el caso en la bandeja de ausentismos.',
      keywords: ['ausencia', 'ausentismo', 'enfermedad', 'certificado'],
      orden: 25,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Procesos',
      pregunta: '¿Dónde veo lo que tengo que aprobar?',
      respuesta:
        'Menú → Procesos → Aprobaciones → pestaña «Para aprobar». Ahí aparecen vacaciones, solicitudes de planta, sistemas y otros trámites que requieren tu OK. En «Mis pedidos» ves lo que vos iniciaste.',
      keywords: ['aprobaciones', 'aprobar', 'pedidos', 'workflow', 'lider'],
      orden: 30,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'Operaciones',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Procesos',
      pregunta: '¿Cómo abro una solicitud de mantenimiento o calidad?',
      respuesta:
        'Menú → Procesos → Mis solicitudes → Nueva. Elegí la plantilla (Mantenimiento de planta, Calidad / no conformidad, Soporte sistemas, etc.), completá planta/línea o lote y enviá. El flujo de aprobación se dispara solo.',
      keywords: ['solicitud', 'mantenimiento', 'calidad', 'planta', 'ot'],
      orden: 35,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'Operaciones',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Beneficios',
      pregunta: '¿Cómo canjeo puntos o veo beneficios?',
      respuesta:
        'Menú → Herramientas → Beneficios. Ahí está el catálogo, el carrito y la billetera (si está habilitada). También podés ver accesos rápidos desde el hub del muro.',
      keywords: ['beneficios', 'puntos', 'canje', 'billetera', 'gimnasio'],
      orden: 40,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Planta',
      pregunta: '¿Dónde encuentro teléfonos de emergencia y sedes?',
      respuesta:
        'Menú → Herramientas → Directorio. Hay emergencias, sedes (Arroyito, Córdoba), comedores y contactos útiles con mapa cuando aplica.',
      keywords: ['directorio', 'emergencia', 'planta', 'sede', 'arroyito'],
      orden: 45,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'Seguridad',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Connectia',
      pregunta: '¿Dónde veo las novedades de Arcor?',
      respuesta:
        'En Home (Publicaciones). Ahí aparecen comunicados de planta, campañas de marca y avisos de People. Podés filtrar, guardar posts y cambiar entre lista y carrusel.',
      keywords: ['novedades', 'muro', 'publicaciones', 'home'],
      orden: 50,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'Comunicación',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Connectia',
      pregunta: '¿Cómo uso el asistente?',
      respuesta:
        'Desde la barra inferior tocá Asistente, o Menú → Herramientas → Asistente. Podés preguntar por vacaciones, políticas o cómo abrir un trámite; te sugiere enlaces de la app.',
      keywords: ['asistente', 'chatbot', 'ia', 'ayuda'],
      orden: 55,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'Soporte',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Sistemas',
      pregunta: '¿Qué hago si no entra la VPN o SAP?',
      respuesta:
        'Abrí Mis solicitudes → Soporte sistemas. Indicá el sistema (VPN, SAP, correo), la prioridad y si te bloquea el trabajo. IT recibe el ticket y el flujo de aprobación del líder/TI.',
      keywords: ['vpn', 'sap', 'sistemas', 'it', 'acceso'],
      orden: 60,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'IT',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Cumplimiento',
      pregunta: '¿Dónde acepto políticas corporativas?',
      respuesta:
        'Menú → RRHH → Políticas. Abrí las pendientes, leé el contenido y tocá Acepto. Queda registrado con fecha y versión para auditoría.',
      keywords: ['politicas', 'acuse', 'aceptar', 'cumplimiento'],
      orden: 70,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'Legal',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
    {
      tenantId: tenant._id,
      category: 'Encuestas',
      pregunta: '¿Cómo respondo una encuesta de clima?',
      respuesta:
        'Menú → Herramientas → Encuestas, o desde el aviso del muro. Las pendientes aparecen arriba. Completá las obligatorias y enviá. Algunas pueden ser anónimas.',
      keywords: ['encuesta', 'clima', 'pulse', 'responder'],
      orden: 80,
      status: 'published',
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      revisadoEn: new Date(),
    },
  ])

  for (const f of faqs) {
    await syncKbSource('faq', f)
    await f.save()
  }

  const tutorials = await Tutorial.create([
    {
      tenantId: tenant._id,
      category: 'Primeros pasos',
      titulo: `Primeros pasos en Connectia (${brand})`,
      descripcion: 'Recorrido rápido: menú, muro, procesos y ayuda para colaboradores Arcor.',
      moduloRelacionado: 'muro',
      keywords: ['onboarding', 'primeros pasos', 'arcor', 'menu'],
      orden: 10,
      status: 'published',
      showOnFirstLogin: true,
      audience: AUDIENCE,
      authorName: brand,
      publishedAt: new Date(),
      steps: [
        {
          orden: 1,
          titulo: 'Abrí el menú',
          cuerpo:
            'Tocá Menú abajo a la derecha. Los grupos (Muro, Procesos, Licencias, Herramientas, RRHH, Notificaciones) arrancan colapsados: abrí el que necesites.',
          mediaType: 'none',
        },
        {
          orden: 2,
          titulo: 'Mirá el muro',
          cuerpo:
            'En Home ves novedades de planta y marca. En vista carrusel también aparecen franjas de Beneficios, Agenda, Solicitudes, Encuestas, Avisos y Chat.',
          mediaType: 'none',
        },
        {
          orden: 3,
          titulo: 'Pedí un trámite',
          cuerpo:
            'En Procesos → Mis solicitudes o en Licencias y ausencias cargás vacaciones, ausencias u otros pedidos. El estado se sigue en la misma pantalla.',
          mediaType: 'none',
        },
        {
          orden: 4,
          titulo: 'Consultá Ayuda',
          cuerpo:
            'En Notificaciones → Ayuda tenés FAQs y este tipo de tutoriales. También podés preguntarle al Asistente.',
          mediaType: 'none',
        },
      ],
    },
    {
      tenantId: tenant._id,
      category: 'RRHH',
      titulo: 'Pedir vacaciones en Arcor',
      descripcion: 'Paso a paso para solicitar días libres y seguir la aprobación.',
      moduloRelacionado: 'licencias',
      keywords: ['vacaciones', 'licencias', 'rrhh', 'saldo'],
      orden: 20,
      status: 'published',
      showOnFirstLogin: false,
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      steps: [
        {
          orden: 1,
          titulo: 'Entrá a Vacaciones',
          cuerpo: 'Menú → Licencias y ausencias → Vacaciones. Revisá tu saldo disponible.',
          mediaType: 'none',
        },
        {
          orden: 2,
          titulo: 'Completá el pedido',
          cuerpo: 'Elegí tipo, fechas y motivo. Adjuntá documentación si te la piden.',
          mediaType: 'none',
        },
        {
          orden: 3,
          titulo: 'Seguí la aprobación',
          cuerpo:
            'Tu líder recibe el caso en Aprobaciones. Vos lo ves en Mis pedidos y en el detalle de la licencia.',
          mediaType: 'none',
        },
      ],
    },
    {
      tenantId: tenant._id,
      category: 'Procesos',
      titulo: 'Aprobar trámites de tu equipo',
      descripcion: 'Cómo usar la bandeja «Para aprobar» si sos líder o gestor.',
      moduloRelacionado: 'aprobaciones',
      keywords: ['aprobar', 'lider', 'bandeja', 'workflow'],
      orden: 30,
      status: 'published',
      showOnFirstLogin: false,
      audience: AUDIENCE,
      authorName: 'Operaciones',
      publishedAt: new Date(),
      steps: [
        {
          orden: 1,
          titulo: 'Abrí Aprobaciones',
          cuerpo: 'Menú → Procesos → Aprobaciones. La pestaña «Para aprobar» lista lo pendiente para vos.',
          mediaType: 'none',
        },
        {
          orden: 2,
          titulo: 'Revisá el pedido',
          cuerpo: 'Abrí el detalle: tipo, fechas, campos del formulario e historial del flujo.',
          mediaType: 'none',
        },
        {
          orden: 3,
          titulo: 'Decidí',
          cuerpo: 'Aprobá o rechazá con un comentario. El solicitante recibe la actualización.',
          mediaType: 'none',
        },
      ],
    },
    {
      tenantId: tenant._id,
      category: 'Planta',
      titulo: 'Reportar un desvío de mantenimiento o calidad',
      descripcion: 'Abrí una OT o no conformidad desde Mis solicitudes.',
      moduloRelacionado: 'solicitudes',
      keywords: ['mantenimiento', 'calidad', 'planta', 'desvio'],
      orden: 40,
      status: 'published',
      showOnFirstLogin: false,
      audience: AUDIENCE,
      authorName: 'Planta Arroyito',
      publishedAt: new Date(),
      steps: [
        {
          orden: 1,
          titulo: 'Nueva solicitud',
          cuerpo: 'Procesos → Mis solicitudes → Nueva. Elegí Mantenimiento o Calidad / no conformidad.',
          mediaType: 'none',
        },
        {
          orden: 2,
          titulo: 'Datos de planta',
          cuerpo: 'Indicá planta (Arroyito/Córdoba), línea o lote OP y la prioridad del desvío.',
          mediaType: 'none',
        },
        {
          orden: 3,
          titulo: 'Seguimiento',
          cuerpo: 'Vas a ver respuestas del gestor en el hilo del ticket y el estado del flujo.',
          mediaType: 'none',
        },
      ],
    },
    {
      tenantId: tenant._id,
      category: 'Beneficios',
      titulo: 'Canjear un beneficio',
      descripcion: 'Catálogo, carrito y puntos en la app Arcor.',
      moduloRelacionado: 'beneficios',
      keywords: ['beneficios', 'canje', 'puntos', 'carrito'],
      orden: 50,
      status: 'published',
      showOnFirstLogin: false,
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      steps: [
        {
          orden: 1,
          titulo: 'Abrí Beneficios',
          cuerpo: 'Menú → Herramientas → Beneficios (o la franja del muro en carrusel).',
          mediaType: 'none',
        },
        {
          orden: 2,
          titulo: 'Elegí y canjeá',
          cuerpo: 'Sumá al carrito y confirmá el canje. Si hay billetera, vas a ver tu saldo de puntos.',
          mediaType: 'none',
        },
      ],
    },
    {
      tenantId: tenant._id,
      category: 'Encuestas',
      titulo: 'Responder una encuesta de clima',
      descripcion: 'Completá pulses y encuestas de People o de campaña.',
      moduloRelacionado: 'encuestas',
      keywords: ['encuesta', 'clima', 'pulse'],
      orden: 60,
      status: 'published',
      showOnFirstLogin: false,
      audience: AUDIENCE,
      authorName: 'People & Culture',
      publishedAt: new Date(),
      steps: [
        {
          orden: 1,
          titulo: 'Entrá a Encuestas',
          cuerpo: 'Desde Herramientas → Encuestas o desde un aviso en el muro.',
          mediaType: 'none',
        },
        {
          orden: 2,
          titulo: 'Respondé y enviá',
          cuerpo: 'Completá las obligatorias. Si es anónima, tu nombre no aparece en los resultados.',
          mediaType: 'none',
        },
      ],
    },
    {
      tenantId: tenant._id,
      category: 'Connectia',
      titulo: 'Usar el Directorio de datos útiles',
      descripcion: 'Emergencias, sedes y contactos de Arcor.',
      moduloRelacionado: 'directorio',
      keywords: ['directorio', 'emergencia', 'sede', 'mapa'],
      orden: 70,
      status: 'published',
      showOnFirstLogin: false,
      audience: AUDIENCE,
      authorName: 'Comunicación',
      publishedAt: new Date(),
      steps: [
        {
          orden: 1,
          titulo: 'Abrí Directorio',
          cuerpo: 'Menú → Herramientas → Directorio.',
          mediaType: 'none',
        },
        {
          orden: 2,
          titulo: 'Filtrá por tipo',
          cuerpo: 'Emergencias, sedes, comedores u otros. En sedes podés ver el mapa si hay coordenadas.',
          mediaType: 'none',
        },
      ],
    },
  ])

  for (const t of tutorials) {
    await syncKbSource('tutorial', t)
    await t.save()
  }

  return { faqs: faqs.length, tutorials: tutorials.length, skipped: false }
}
