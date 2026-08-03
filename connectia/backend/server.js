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
import postsMediaSearchRoutes from './src/routes/postsMediaSearch.js'
import postsImportAdminRoutes from './src/routes/postsImportAdmin.js'
import storiesRoutes from './src/routes/stories.js'
import storiesAdminRoutes from './src/routes/storiesAdmin.js'
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
import orgRoutes from './src/routes/org.js'
import audienceClientsAdminRoutes from './src/routes/audienceClientsAdmin.js'
import reportsAdminRoutes from './src/routes/reportsAdmin.js'
import profileFieldsAdminRoutes from './src/routes/profileFieldsAdmin.js'
import rolesAdminRoutes from './src/routes/rolesAdmin.js'
import paramsAdminRoutes from './src/routes/paramsAdmin.js'
import postCategoriesAdminRoutes from './src/routes/postCategoriesAdmin.js'
import postTemplatesAdminRoutes from './src/routes/postTemplatesAdmin.js'
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
import uploadsSurveysAdminRoutes from './src/routes/uploadsSurveysAdmin.js'
import pointsRulesAdminRoutes from './src/routes/pointsRulesAdmin.js'
import walletRoutes from './src/routes/wallet.js'
import spacesRoutes from './src/routes/spaces.js'
import spacesAdminRoutes from './src/routes/spacesAdmin.js'
import attendanceRoutes from './src/routes/attendance.js'
import attendanceAdminRoutes from './src/routes/attendanceAdmin.js'
import supervisionRoutes from './src/routes/supervision.js'
import supervisionAdminRoutes from './src/routes/supervisionAdmin.js'
import supervisionEcrRoutes from './src/routes/supervisionEcr.js'
import relevamientosRoutes from './src/routes/relevamientos.js'
import relevamientosAdminRoutes from './src/routes/relevamientosAdmin.js'
import pedidosRoutes from './src/routes/pedidos.js'
import pedidosAdminRoutes from './src/routes/pedidosAdmin.js'
import serviciosRoutes from './src/routes/servicios.js'
import serviciosAdminRoutes from './src/routes/serviciosAdmin.js'
import teamRoutes from './src/routes/team.js'
import teamAdminRoutes from './src/routes/teamAdmin.js'
import talentRoutes from './src/routes/talent.js'
import talentAdminRoutes from './src/routes/talentAdmin.js'
import cultureRoutes from './src/routes/culture.js'
import cultureAdminRoutes from './src/routes/cultureAdmin.js'
import tvRoutes from './src/routes/tv.js'
import tvAdminRoutes from './src/routes/tvAdmin.js'
import liveRoutes from './src/routes/live.js'
import liveAdminRoutes from './src/routes/liveAdmin.js'
import notificationsRoutes from './src/routes/notifications.js'
import newsletterAdminRoutes from './src/routes/newsletterAdmin.js'
import communicationsAdminRoutes from './src/routes/communicationsAdmin.js'
import whatsappWebhookRoutes from './src/routes/whatsappWebhook.js'
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
import { startNewsletterRuleScheduler } from './src/services/newsletterRuleScheduler.js'
import { startSpaceReminderScheduler } from './src/services/spaceReminderScheduler.js'

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
app.use('/api/stories', storiesRoutes)
app.use('/api/comments', commentsRoutes)
app.use('/api/admin/comments', commentsAdminRoutes)
app.use('/api/admin/posts/ai', postsAiRoutes)
app.use('/api/admin/posts/web-news', postsWebNewsRoutes)
app.use('/api/admin/posts/media-search', postsMediaSearchRoutes)
app.use('/api/admin/posts/upload', uploadsAdminRoutes)
app.use('/api/admin/posts/import', postsImportAdminRoutes)
app.use('/api/admin/posts', postsAdminRoutes)
app.use('/api/admin/stories', storiesAdminRoutes)
app.use('/api/admin/newsletters', newsletterAdminRoutes)
app.use('/api/admin/communications', communicationsAdminRoutes)
app.use('/api/webhooks', whatsappWebhookRoutes)
app.use('/api/admin/users', usersImportAdminRoutes)
app.use('/api/admin/users', usersAdminRoutes)
app.use('/api/admin/legajos', legajosAdminRoutes)
app.use('/api/admin/hr-catalogs', hrCatalogAdminRoutes)
app.use('/api/hr-catalogs', hrCatalogsRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/admin/onboarding', onboardingAdminRoutes)
app.use('/api/admin/org', orgAdminRoutes)
app.use('/api/org', orgRoutes)
app.use('/api/admin/audience-clients', audienceClientsAdminRoutes)
app.use('/api/admin/reports', reportsAdminRoutes)
app.use('/api/admin/profile-fields', profileFieldsAdminRoutes)
app.use('/api/admin/roles', rolesAdminRoutes)
app.use('/api/admin/params', paramsAdminRoutes)
app.use('/api/admin/post-categories', postCategoriesAdminRoutes)
app.use('/api/admin/post-templates', postTemplatesAdminRoutes)
app.use('/api/requests', requestsRoutes)
app.use('/api/request-types', requestTypesRoutes)
app.use('/api/licencias', licenciasRoutes)
app.use('/api/admin/licencias', licenciasAdminRoutes)
app.use('/api/ausentismos', ausentismosRoutes)
app.use('/api/admin/ausentismos', ausentismosAdminRoutes)
app.use('/api/surveys', surveysRoutes)
app.use('/api/admin/surveys/upload', uploadsSurveysAdminRoutes)
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
app.use('/api/spaces', spacesRoutes)
app.use('/api/admin/spaces', spacesAdminRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/admin/attendance', attendanceAdminRoutes)
app.use('/api/supervision', supervisionRoutes)
app.use('/api/supervision/ecr', supervisionEcrRoutes)
app.use('/api/admin/supervision', supervisionAdminRoutes)
app.use('/api/relevamientos', relevamientosRoutes)
app.use('/api/admin/relevamientos', relevamientosAdminRoutes)
app.use('/api/pedidos', pedidosRoutes)
app.use('/api/admin/pedidos', pedidosAdminRoutes)
app.use('/api/servicios', serviciosRoutes)
app.use('/api/admin/servicios', serviciosAdminRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/admin/team', teamAdminRoutes)
app.use('/api/talent', talentRoutes)
app.use('/api/admin/talent', talentAdminRoutes)
app.use('/api/culture', cultureRoutes)
app.use('/api/admin/culture', cultureAdminRoutes)
app.use('/api/tv', tvRoutes)
app.use('/api/admin/tv', tvAdminRoutes)
app.use('/api/live', liveRoutes)
app.use('/api/admin/live', liveAdminRoutes)
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
  startNewsletterRuleScheduler()
  startSpaceReminderScheduler()
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
