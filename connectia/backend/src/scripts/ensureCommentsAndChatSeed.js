import 'dotenv/config'
import { connectDB } from '../config/database.js'
import { Tenant } from '../models/Tenant.js'
import { User } from '../models/User.js'
import { Post } from '../models/Post.js'
import { seedCommentsForTenant } from './seedComments.js'
import { seedChatForTenant } from './seedChat.js'

await connectDB()

const CODES = ['DEMO', 'ARCOR', 'THEFORK']

for (const empCodigo of CODES) {
  const tenant = await Tenant.findOne({ empCodigo })
  if (!tenant) {
    console.log(empCodigo, '— tenant no encontrado')
    continue
  }

  // Config mínima de moderación de comentarios
  tenant.commentsModeration = {
    enabled: true,
    requireApproval: false,
    autoHideMinScore: 0,
    notifyModeratorsMinScore: 80,
    glossary: Array.isArray(tenant.commentsModeration?.glossary)
      ? tenant.commentsModeration.glossary
      : ['confidencial'],
  }
  if (!tenant.chatConfig) {
    tenant.chatConfig = {
      retentionDays: 365,
      allowGroups: true,
      allowAttachments: true,
      maxAttachmentMb: 15,
      maxGroupMembers: 50,
    }
  }
  await tenant.save()

  const users = await User.find({ tenantId: tenant._id, activo: { $ne: false } })
    .sort({ createdAt: 1 })
    .limit(6)
  const authors = users.slice(0, 3)
  const post =
    (await Post.findOne({ tenantId: tenant._id, status: 'published' }).sort({ publishedAt: -1 })) ||
    (await Post.findOne({ tenantId: tenant._id }).sort({ createdAt: -1 }))

  const comments = await seedCommentsForTenant({
    tenant,
    post,
    authors,
  })
  const chat = await seedChatForTenant({
    tenant,
    users: authors.length >= 2 ? authors : users.slice(0, 3),
  })

  console.log(
    empCodigo,
    `→ comentarios ${comments.created || 0}${comments.skipped ? ' (skip)' : ''}`,
    `· chat ${chat.chats} chats / ${chat.messages} msgs`,
  )
}

process.exit(0)
