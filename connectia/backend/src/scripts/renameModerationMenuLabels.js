import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { MenuItem } from '../models/MenuItem.js'

await connectDB()

const renames = [
  {
    filter: {
      $or: [
        { key: 'admin.comentarios' },
        { key: 'moderacion-comentarios' },
        { route: '/moderacion-comentarios' },
      ],
    },
    label: 'Moderación de comentarios',
  },
  {
    filter: {
      $or: [{ key: 'admin.chatmod' }, { key: 'chatmod' }, { route: '/chat-moderacion' }],
    },
    label: 'Moderación de chat',
  },
]

for (const { filter, label } of renames) {
  const r = await MenuItem.updateMany(filter, { $set: { label } })
  console.log(label, '→', r.modifiedCount, 'actualizados')
}
process.exit(0)
