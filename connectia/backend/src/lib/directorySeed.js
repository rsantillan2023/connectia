import { DirectoryEntry } from '../models/DirectoryEntry.js'

/** Imágenes stock por tipo (cuadradas, listas para avatar). */
export const DIRECTORY_STOCK_IMAGES = {
  emergencia:
    'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=240&h=240&fit=crop&q=80',
  sede: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=240&h=240&fit=crop&q=80',
  servicio: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=240&h=240&fit=crop&q=80',
  telefono: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=240&h=240&fit=crop&q=80',
  persona: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f47?w=240&h=240&fit=crop&q=80',
  otro: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=240&h=240&fit=crop&q=80',
}

/**
 * Entradas mínimas de directorio al crear un suscriptor (§21).
 * Al menos 4 contactos útiles genéricos, personalizables con el nombre del tenant.
 */
export function defaultDirectoryEntries(brandName = 'la empresa') {
  const brand = String(brandName || 'la empresa').trim() || 'la empresa'
  return [
    {
      tipo: 'emergencia',
      nombre: 'Emergencias médicas',
      categoria: 'Urgencias',
      descripcion: 'Línea de emergencias internas (completar con el número real del tenant).',
      telefono: '911',
      destacado: true,
      orden: 1,
      color: '#b91c1c',
      imageUrl: DIRECTORY_STOCK_IMAGES.emergencia,
    },
    {
      tipo: 'emergencia',
      nombre: 'Seguridad / control de accesos',
      categoria: 'Urgencias',
      descripcion: `Seguridad del edificio — ${brand}`,
      telefono: '100',
      interno: '100',
      orden: 2,
      color: '#b91c1c',
      imageUrl:
        'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=240&h=240&fit=crop&q=80',
    },
    {
      tipo: 'servicio',
      nombre: 'Recepción',
      categoria: 'Planta baja',
      descripcion: 'Informes, visitas y mensajería',
      telefono: '',
      interno: '200',
      email: '',
      horario: 'Lun–Vie 9 a 18',
      orden: 10,
      imageUrl:
        'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=240&h=240&fit=crop&q=80',
    },
    {
      tipo: 'servicio',
      nombre: 'Mesa de ayuda IT',
      categoria: 'Sistemas',
      descripcion: 'Soporte de notebook, VPN y accesos',
      interno: '300',
      horario: 'Lun–Vie 9 a 18',
      orden: 20,
      imageUrl:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=240&h=240&fit=crop&q=80',
    },
    {
      tipo: 'servicio',
      nombre: 'RRHH — consultas',
      categoria: 'Personas',
      descripcion: `Consultas generales de personas — ${brand}`,
      interno: '450',
      horario: 'Lun–Vie 10 a 16',
      orden: 30,
      imageUrl: DIRECTORY_STOCK_IMAGES.persona,
    },
    {
      tipo: 'sede',
      nombre: 'Casa central',
      categoria: 'Sedes',
      descripcion: `Oficina principal de ${brand} (completar dirección y mapa).`,
      direccion: '',
      ciudad: '',
      orden: 40,
      destacado: true,
      imageUrl: DIRECTORY_STOCK_IMAGES.sede,
    },
  ]
}

/**
 * Upsert de directorio base. No pisa entradas ya editadas con el mismo nombre,
 * pero completa imageUrl si está vacío.
 * @returns {{ created: number, updatedImages: number, total: number }}
 */
export async function seedDirectoryForTenant(tenantId, { brandName } = {}) {
  if (!tenantId) throw new Error('tenantId requerido')
  const rows = defaultDirectoryEntries(brandName)
  let created = 0
  let updatedImages = 0
  for (const row of rows) {
    const existing = await DirectoryEntry.findOne({ tenantId, nombre: row.nombre }).select(
      '_id imageUrl',
    )
    if (existing) {
      if (!existing.imageUrl && row.imageUrl) {
        await DirectoryEntry.updateOne({ _id: existing._id }, { $set: { imageUrl: row.imageUrl } })
        updatedImages += 1
      }
      continue
    }
    await DirectoryEntry.create({
      ...row,
      tenantId,
      activo: true,
      audience: { mode: 'all', areaIds: [], groupIds: [] },
    })
    created += 1
  }
  const total = await DirectoryEntry.countDocuments({ tenantId, activo: true })
  return { created, updatedImages, total }
}
