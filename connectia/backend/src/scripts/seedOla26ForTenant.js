/**
 * Seed Ola 26 — Modo TV canal de sede + Live (URL externa).
 * Uso: node src/scripts/seedOla26ForTenant.js [tenantCode]
 */
import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { TvPlaylist } from '../models/Tv.js'
import { LiveBroadcast } from '../models/LiveBroadcast.js'
import { activateOla26ForTenant } from '../lib/ensureOla26Menu.js'
import { defaultTvPlaylistItems, defaultChannelConfig, scrubRickrollPlaylistItems } from '../lib/tvLive.js'

const code = process.argv[2] || 'DEMO'

await connectDB()
const tenant = await Tenant.findOne({ empCodigo: new RegExp(`^${code}$`, 'i') })
if (!tenant) {
  console.error('Tenant no encontrado:', code)
  process.exit(1)
}

await activateOla26ForTenant(tenant)
console.log('Caps + menú Ola 26 OK:', tenant.empCodigo)

const channel = defaultChannelConfig(tenant.nombre)
const demoItems = defaultTvPlaylistItems(tenant.nombre)

let playlist = await TvPlaylist.findOne({
  tenantId: tenant._id,
  name: { $in: ['Canal sede', 'Playlist demo sede', 'Playlist sede'] },
}).sort({ updatedAt: -1 })

if (!playlist) {
  playlist = await TvPlaylist.create({
    tenantId: tenant._id,
    name: 'Canal sede',
    fallbackText: `${tenant.nombre || 'Connectia'} · pantalla en espera`,
    channel,
    items: demoItems,
  })
  console.log('Canal sede creado', String(playlist._id))
} else {
  playlist.name = 'Canal sede'
  playlist.channel = channel
  playlist.items = demoItems
  playlist.fallbackText = `${tenant.nombre || 'Connectia'} · pantalla en espera`
  playlist.version = (playlist.version || 1) + 1
  await playlist.save()
  console.log('Canal sede actualizado', String(playlist._id))
}

// Migrar otras playlists con rickroll / sin canal
const others = await TvPlaylist.find({ tenantId: tenant._id, _id: { $ne: playlist._id } })
for (const pl of others) {
  const scrubbed = scrubRickrollPlaylistItems(pl.items)
  if (scrubbed.dirty || !pl.channel?.wallEnabled) {
    pl.channel = channel
    if (scrubbed.dirty) pl.items = scrubbed.items.length ? scrubbed.items : demoItems
    pl.version = (pl.version || 1) + 1
    await pl.save()
    console.log('Playlist migrada a canal', pl.name, String(pl._id))
  }
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

console.log('Ola 26 seed OK — canal con bienvenida + muro automático')
process.exit(0)
