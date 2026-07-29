import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './src/config/database.js'
import healthRoutes from './src/routes/health.js'
import authRoutes from './src/routes/auth.js'
import menuRoutes from './src/routes/menu.js'
import menuAdminRoutes from './src/routes/menuAdmin.js'
import tenantsRoutes from './src/routes/tenants.js'
import meRoutes from './src/routes/me.js'
import postsRoutes from './src/routes/posts.js'
import postsAdminRoutes from './src/routes/postsAdmin.js'
import postsAiRoutes from './src/routes/postsAi.js'
import postsWebNewsRoutes from './src/routes/postsWebNews.js'
import uploadsAdminRoutes from './src/routes/uploadsAdmin.js'
import uploadsBrandingAdminRoutes from './src/routes/uploadsBrandingAdmin.js'
import usersAdminRoutes from './src/routes/usersAdmin.js'
import usersImportAdminRoutes from './src/routes/usersImportAdmin.js'
import legajosAdminRoutes from './src/routes/legajosAdmin.js'
import hrCatalogAdminRoutes from './src/routes/hrCatalogAdmin.js'
import hrCatalogsRoutes from './src/routes/hrCatalogs.js'
import onboardingRoutes from './src/routes/onboarding.js'
import onboardingAdminRoutes from './src/routes/onboardingAdmin.js'
import orgAdminRoutes from './src/routes/orgAdmin.js'
import profileFieldsAdminRoutes from './src/routes/profileFieldsAdmin.js'
import rolesAdminRoutes from './src/routes/rolesAdmin.js'
import paramsAdminRoutes from './src/routes/paramsAdmin.js'
import postCategoriesAdminRoutes from './src/routes/postCategoriesAdmin.js'
import requestsRoutes from './src/routes/requests.js'
import requestTypesRoutes from './src/routes/requestTypes.js'
import licenciasRoutes from './src/routes/licencias.js'
import licenciasAdminRoutes from './src/routes/licenciasAdmin.js'
import ausentismosRoutes from './src/routes/ausentismos.js'
import ausentismosAdminRoutes from './src/routes/ausentismosAdmin.js'
import mediaProxyRoutes from './src/routes/mediaProxy.js'
import surveysRoutes from './src/routes/surveys.js'
import surveysAdminRoutes from './src/routes/surveysAdmin.js'
import documentsRoutes from './src/routes/documents.js'
import documentsAdminRoutes from './src/routes/documentsAdmin.js'
import documentsUploadAdminRoutes from './src/routes/documentsUploadAdmin.js'
import helpRoutes from './src/routes/help.js'
import helpAdminRoutes from './src/routes/helpAdmin.js'
import policiesRoutes from './src/routes/policies.js'
import policiesAdminRoutes from './src/routes/policiesAdmin.js'
import hubLinksRoutes from './src/routes/hubLinks.js'
import hubLinksAdminRoutes from './src/routes/hubLinksAdmin.js'
import directoryRoutes from './src/routes/directory.js'
import directoryAdminRoutes from './src/routes/directoryAdmin.js'
import eventsRoutes from './src/routes/events.js'
import eventsAdminRoutes from './src/routes/eventsAdmin.js'
import calendarSyncRoutes from './src/routes/calendarSync.js'
import benefitsRoutes from './src/routes/benefits.js'
import benefitsAdminRoutes from './src/routes/benefitsAdmin.js'
import uploadsBenefitsAdminRoutes from './src/routes/uploadsBenefitsAdmin.js'
import uploadsEventsAdminRoutes from './src/routes/uploadsEventsAdmin.js'
import pointsRulesAdminRoutes from './src/routes/pointsRulesAdmin.js'
import walletRoutes from './src/routes/wallet.js'
import notificationsRoutes from './src/routes/notifications.js'
import newsletterAdminRoutes from './src/routes/newsletterAdmin.js'
import notificationsAdminRoutes from './src/routes/notificationsAdmin.js'
import greetingsAdminRoutes from './src/routes/greetingsAdmin.js'
import commentsRoutes from './src/routes/comments.js'
import commentsAdminRoutes from './src/routes/commentsAdmin.js'
import chatRoutes from './src/routes/chat.js'
import chatAdminRoutes from './src/routes/chatAdmin.js'
import workflowsAdminRoutes from './src/routes/workflowsAdmin.js'
import approvalsRoutes from './src/routes/approvals.js'
import assistantRoutes from './src/routes/assistant.js'
import kbAdminRoutes from './src/routes/kbAdmin.js'
import { startPushCampaignScheduler } from './src/services/pushCampaignScheduler.js'
import { startGreetingScheduler } from './src/services/greetingScheduler.js'
import { startPostPublishScheduler } from './src/services/postPublishScheduler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = Number(process.env.PORT || 4000)
// API dinámica: ETag provoca 304 con cuerpos viejos (p.ej. bandeja de avisos).
app.set('etag', false)

const origins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)
app.use(
  cors({
    origin: origins.length ? origins : true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
/** Logos estáticos de seed (ej. /branding/thefork-logo.svg en frontend/public) */
app.use(
  '/branding',
  express.static(path.join(__dirname, '../frontend/public/branding')),
)
app.use('/api/media', mediaProxyRoutes)
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID()
  res.setHeader('x-request-id', req.requestId)
  next()
})

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/admin/menu', menuAdminRoutes)
app.use('/api/admin/tenants/upload', uploadsBrandingAdminRoutes)
app.use('/api/admin/tenants', tenantsRoutes)
app.use('/api/me', meRoutes)
app.use('/api/posts', postsRoutes)
app.use('/api/comments', commentsRoutes)
app.use('/api/admin/comments', commentsAdminRoutes)
app.use('/api/admin/posts/ai', postsAiRoutes)
app.use('/api/admin/posts/web-news', postsWebNewsRoutes)
app.use('/api/admin/posts/upload', uploadsAdminRoutes)
app.use('/api/admin/posts', postsAdminRoutes)
app.use('/api/admin/newsletters', newsletterAdminRoutes)
app.use('/api/admin/users', usersImportAdminRoutes)
app.use('/api/admin/users', usersAdminRoutes)
app.use('/api/admin/legajos', legajosAdminRoutes)
app.use('/api/admin/hr-catalogs', hrCatalogAdminRoutes)
app.use('/api/hr-catalogs', hrCatalogsRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/admin/onboarding', onboardingAdminRoutes)
app.use('/api/admin/org', orgAdminRoutes)
app.use('/api/admin/profile-fields', profileFieldsAdminRoutes)
app.use('/api/admin/roles', rolesAdminRoutes)
app.use('/api/admin/params', paramsAdminRoutes)
app.use('/api/admin/post-categories', postCategoriesAdminRoutes)
app.use('/api/requests', requestsRoutes)
app.use('/api/request-types', requestTypesRoutes)
app.use('/api/licencias', licenciasRoutes)
app.use('/api/admin/licencias', licenciasAdminRoutes)
app.use('/api/ausentismos', ausentismosRoutes)
app.use('/api/admin/ausentismos', ausentismosAdminRoutes)
app.use('/api/surveys', surveysRoutes)
app.use('/api/admin/surveys', surveysAdminRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/admin/documents/upload', documentsUploadAdminRoutes)
app.use('/api/admin/documents', documentsAdminRoutes)
app.use('/api/help', helpRoutes)
app.use('/api/admin/help', helpAdminRoutes)
app.use('/api/policies', policiesRoutes)
app.use('/api/admin/policies', policiesAdminRoutes)
app.use('/api/hub', hubLinksRoutes)
app.use('/api/admin/hub', hubLinksAdminRoutes)
app.use('/api/directory', directoryRoutes)
app.use('/api/admin/directory', directoryAdminRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/admin/events/upload', uploadsEventsAdminRoutes)
app.use('/api/admin/events', eventsAdminRoutes)
app.use('/api/calendar', calendarSyncRoutes)
app.use('/api/benefits', benefitsRoutes)
app.use('/api/admin/benefits/upload', uploadsBenefitsAdminRoutes)
app.use('/api/admin/benefits', benefitsAdminRoutes)
app.use('/api/admin/points-rules', pointsRulesAdminRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/admin/notifications', notificationsAdminRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/admin/chat', chatAdminRoutes)
app.use('/api/admin/greetings', greetingsAdminRoutes)
app.use('/api/admin/workflows', workflowsAdminRoutes)
app.use('/api/approvals', approvalsRoutes)
app.use('/api/assistant', assistantRoutes)
app.use('/api/admin/kb', kbAdminRoutes)

app.use((err, req, res, _next) => {
  console.error(`[${req.requestId}]`, err)
  res.status(err.status || 500).json({
    error: err.message || 'Error interno',
    requestId: req.requestId,
  })
})

await connectDB()
const server = app.listen(port, () => {
  console.log(`Connectia API http://localhost:${port}`)
  startPushCampaignScheduler()
  startGreetingScheduler()
  startPostPublishScheduler()
})
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPuerto ${port} ocupado. Otro proceso ya está corriendo el backend.\n` +
        `Solución:\n` +
        `  npm run free-port\n` +
        `  npm run dev\n` +
        `(No uses dos terminales con npm run dev a la vez.)\n`,
    )
    process.exit(1)
  }
  throw err
})
