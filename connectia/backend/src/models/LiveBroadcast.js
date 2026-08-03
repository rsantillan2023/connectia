import mongoose from 'mongoose'
import { audienceSchema } from './Tv.js'

const liveBroadcastSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    coverUrl: { type: String, maxlength: 2000, default: '' },
    /** external = YouTube/Vimeo/HLS · camera = WebRTC nativo desde admin */
    source: {
      type: String,
      enum: ['external', 'camera'],
      default: 'external',
      index: true,
    },
    /** Para camera: sentinel webrtc:native */
    streamUrl: { type: String, required: true, maxlength: 2000 },
    replayUrl: { type: String, maxlength: 2000, default: '' },
    audience: { type: audienceSchema, default: () => ({ mode: 'all' }) },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'live', 'ended'],
      default: 'draft',
      index: true,
    },
    /**
     * Biblioteca reutilizable (URL): true = visible en En vivo; false = guardada apagada.
     * Cámara ignora este flag (usa status live).
     */
    activo: { type: Boolean, default: false, index: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0, min: 0 },
    /** Viewers WebRTC conectados (aprox.; limpia al terminar) */
    peerCount: { type: Number, default: 0, min: 0 },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

liveBroadcastSchema.index({ tenantId: 1, status: 1, startsAt: -1 })
liveBroadcastSchema.index({ tenantId: 1, activo: 1, source: 1 })

export const LiveBroadcast = mongoose.model('LiveBroadcast', liveBroadcastSchema)
