/**
 * Seed Ola 26 — Modo TV + Live (URL externa).
 * Uso: node src/scripts/seedOla26ForTenant.js [tenantCode]
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { TvPlaylist } from '../models/Tv.js'
import { LiveBroadcast } from '../models/LiveBroadcast.js'
import { activateOla26ForTenant } from '../lib/ensureOla26Menu.js'

const code = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

await activateOla26ForTenant(tenant)
console.log('Caps + menú Ola 26 OK:', tenant.empCodigo)

let playlist = await TvPlaylist.findOne({ tenantId: tenant._id, name: 'Playlist demo sede' })
if (!playlist) {
  playlist = await TvPlaylist.create({
    tenantId: tenant._id,
    name: 'Playlist demo sede',
    fallbackText: `${tenant.nombre || 'Connectia'} · pantalla en espera`,
    items: [
      {
        type: 'text',
        text: `Bienvenidos a ${tenant.nombre || 'la comunidad'}`,
        durationSec: 12,
        order: 0,
      },
      {
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationSec: 30,
        order: 1,
      },
      {
        type: 'text',
        text: 'Recordá mirar el muro y los avisos',
        durationSec: 10,
        order: 2,
      },
    ],
  })
  console.log('Playlist demo creada', String(playlist._id))
} else {
  console.log('Playlist demo ya existía')
}

const liveTitle = 'Live demo comunidad'
let live = await LiveBroadcast.findOne({ tenantId: tenant._id, title: liveTitle })
if (!live) {
  const startsAt = new Date()
  const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  live = await LiveBroadcast.create({
    tenantId: tenant._id,
    title: liveTitle,
    streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    audience: { mode: 'all' },
    status: 'live',
    startsAt,
    endsAt,
  })
  console.log('Live demo creado', String(live._id))
} else {
  console.log('Live demo ya existía')
}

console.log('Ola 26 seed OK')
process.exit(0)
