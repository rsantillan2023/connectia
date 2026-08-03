import mongoose from 'mongoose'

/**
 * Señalización WebRTC por HTTP (polling) para live con cámara.
 * Un documento por mensaje (offer / answer / ice).
 */
const liveWebrtcSignalSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    liveId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveBroadcast', required: true, index: true },
    peerId: { type: String, required: true, maxlength: 80, index: true },
    /** offer | answer | ice-viewer | ice-host */
    kind: {
      type: String,
      enum: ['offer', 'answer', 'ice-viewer', 'ice-host'],
      required: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    consumed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

liveWebrtcSignalSchema.index({ liveId: 1, peerId: 1, kind: 1, createdAt: 1 })
liveWebrtcSignalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 })

export const LiveWebrtcSignal = mongoose.model('LiveWebrtcSignal', liveWebrtcSignalSchema)
