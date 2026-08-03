/**
 * Actualiza playlists TV de ARCOR al canal de sede (bienvenida + muro).
 * Uso: node src/scripts/fixArcorTvPlaylist.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { TvPlaylist } from '../models/Tv.js'
import { defaultTvPlaylistItems, defaultChannelConfig } from '../lib/tvLive.js'

await connectDB()
const t = await Tenant.findOne({ empCodigo: /^ARCOR$/i })
if (!t) {
  console.error('Tenant ARCOR no encontrado')
  process.exit(1)
}
const channel = defaultChannelConfig(t.nombre)
const items = defaultTvPlaylistItems(t.nombre)
const r = await TvPlaylist.updateMany(
  { tenantId: t._id },
  {
    $set: {
      name: 'Canal sede',
      items,
      channel,
      fallbackText: `${t.nombre} · pantalla en espera`,
    },
    $inc: { version: 1 },
  },
)
console.log('Playlists actualizadas:', r.modifiedCount, '· canal muro on · sin rickroll')
await mongoose.disconnect()
process.exit(0)
