import mongoose from 'mongoose'
import { audienceSchema } from './Tv.js'

const liveBroadcastSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    coverUrl: { type: String, maxlength: 2000, default: '' },
    streamUrl: { type: String, required: true, maxlength: 2000 },
    replayUrl: { type: String, maxlength: 2000, default: '' },
    audience: { type: audienceSchema, default: () => ({ mode: 'all' }) },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'live', 'ended'],
      default: 'draft',
      index: true,
    },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0, min: 0 },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

liveBroadcastSchema.index({ tenantId: 1, status: 1, startsAt: -1 })

export const LiveBroadcast = mongoose.model('LiveBroadcast', liveBroadcastSchema)
