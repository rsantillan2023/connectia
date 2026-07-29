import mongoose from 'mongoose'

/** Favorito de hub por usuario (46.05). */
const favoriteLinkSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hubLinkId: { type: mongoose.Schema.Types.ObjectId, ref: 'HubLink', required: true, index: true },
  },
  { timestamps: true },
)

favoriteLinkSchema.index({ tenantId: 1, userId: 1, hubLinkId: 1 }, { unique: true })

export const FavoriteLink = mongoose.model('FavoriteLink', favoriteLinkSchema)
