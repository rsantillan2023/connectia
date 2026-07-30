import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { capabilityForRoute } from '../utils/adminCapabilities'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('../layouts/AdminShell.vue'),
      children: [
        { path: '', name: 'home', component: () => import('../views/DashboardView.vue') },
        {
          path: 'suscriptores',
          name: 'suscriptores',
          component: () => import('../views/SuscriptoresView.vue'),
          meta: { platformOnly: true },
        },
        {
          path: 'comunidad',
          component: () => import('../views/ComunidadView.vue'),
          meta: { tenantOnly: true, capability: 'admin.comunidad' },
        },
        {
          path: 'menu',
          component: () => import('../views/MenuAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.menu' },
        },
        {
          path: 'publicaciones',
          component: () => import('../views/PublicacionesView.vue'),
          meta: { tenantOnly: true, capability: 'admin.publicaciones' },
        },
        {
          path: 'stories',
          component: () => import('../views/StoriesAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.publicaciones' },
        },
        {
          path: 'newsletters',
          name: 'newsletters',
          component: () => import('../views/NewslettersView.vue'),
          meta: { tenantOnly: true, capability: 'admin.publicaciones' },
        },
        {
          path: 'emociones',
          component: () => import('../views/EmocionesAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.publicaciones' },
        },
        {
          path: 'usuarios',
          component: () => import('../views/UsuariosView.vue'),
          meta: { tenantOnly: true, capability: 'admin.usuarios' },
        },
        {
          path: 'legajos',
          component: () => import('../views/LegajosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.legajos' },
        },
        {
          path: 'catalogos-rrhh',
          component: () => import('../views/CatalogosRrhhAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.legajos' },
        },
        {
          path: 'onboarding',
          component: () => import('../views/OnboardingAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.onboarding' },
        },
        {
          path: 'directorio',
          component: () => import('../views/DirectorioAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.directorio' },
        },
        {
          path: 'eventos',
          component: () => import('../views/EventosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.eventos' },
        },
        {
          path: 'beneficios',
          component: () => import('../views/BeneficiosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.beneficios' },
        },
        {
          path: 'reservas',
          component: () => import('../views/ReservasAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.reservas' },
        },
        {
          path: 'asistencia',
          component: () => import('../views/AsistenciaAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.asistencia' },
        },
        {
          path: 'talento',
          component: () => import('../views/TalentoAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.talento' },
        },
        {
          path: 'comunicaciones',
          component: () => import('../views/ComunicacionesView.vue'),
          meta: { tenantOnly: true, capability: 'admin.comunicaciones' },
        },
        {
          path: 'cultura',
          component: () => import('../views/CulturaAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.cultura' },
        },
        {
          path: 'supervision',
          component: () => import('../views/SupervisionAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.supervision' },
        },
        {
          path: 'equipos',
          component: () => import('../views/TeamScopesAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.equipos' },
        },
        {
          path: 'organizacion',
          component: () => import('../views/OrganizacionView.vue'),
          meta: { tenantOnly: true, capability: 'admin.organizacion' },
        },
        {
          path: 'reportes',
          component: () => import('../views/ReportesAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.reportes' },
        },
        {
          path: 'roles',
          component: () => import('../views/RolesAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.roles' },
        },
        {
          path: 'parametros',
          component: () => import('../views/ParametrosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.parametros' },
        },
        {
          path: 'categorias-publicaciones',
          component: () => import('../views/CategoriasPublicacionesView.vue'),
          meta: { tenantOnly: true, capability: 'admin.publicaciones' },
        },
        {
          path: 'solicitudes',
          component: () => import('../views/SolicitudesAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.solicitudes' },
        },
        {
          path: 'tipos-solicitud',
          component: () => import('../views/TiposSolicitudView.vue'),
          meta: { tenantOnly: true, capability: 'admin.tipos-solicitud' },
        },
        {
          path: 'licencias',
          component: () => import('../views/LicenciasAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.licencias' },
        },
        {
          path: 'tipos-licencia',
          component: () => import('../views/TiposLicenciaView.vue'),
          meta: { tenantOnly: true, capability: 'admin.licencias' },
        },
        {
          path: 'feriados',
          component: () => import('../views/FeriadosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.licencias' },
        },
        {
          path: 'ausentismos',
          component: () => import('../views/AusentismosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.ausentismos' },
        },
        {
          path: 'estados-solicitud',
          component: () => import('../views/EstadosSolicitudView.vue'),
          meta: { tenantOnly: true, capability: 'admin.solicitudes' },
        },
        {
          path: 'enviar-solicitud',
          component: () => import('../views/EnviarSolicitudView.vue'),
          meta: { tenantOnly: true, capability: 'admin.solicitudes' },
        },
        {
          path: 'encuestas',
          component: () => import('../views/EncuestasAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.encuestas' },
        },
        {
          path: 'relevamientos',
          component: () => import('../views/RelevamientosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.relevamientos' },
        },
        {
          path: 'pedidos',
          component: () => import('../views/PedidosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.pedidos' },
        },
        {
          path: 'servicios',
          component: () => import('../views/ServiciosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.servicios' },
        },
        {
          path: 'modo-tv',
          component: () => import('../views/ModoTvAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.tv' },
        },
        {
          path: 'live',
          component: () => import('../views/LiveAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.live' },
        },
        {
          path: 'notificaciones',
          component: () => import('../views/NotificacionesAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.notificaciones' },
        },
        {
          path: 'moderacion-comentarios',
          component: () => import('../views/ModeracionComentariosView.vue'),
          meta: { tenantOnly: true, capability: 'admin.comentarios' },
        },
        {
          path: 'saludos',
          component: () => import('../views/SaludosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.saludos' },
        },
        {
          path: 'documentos',
          component: () => import('../views/DocumentosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.documentos' },
        },
        {
          path: 'ayuda',
          component: () => import('../views/AyudaAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.ayuda' },
        },
        {
          path: 'politicas',
          component: () => import('../views/PoliticasAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.politicas' },
        },
        {
          path: 'accesos',
          component: () => import('../views/AccesosAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.hub' },
        },
        {
          path: 'chat-moderacion',
          component: () => import('../views/ChatModeracionView.vue'),
          meta: { tenantOnly: true, capability: 'admin.chat' },
        },
        {
          path: 'workflows',
          component: () => import('../views/WorkflowsAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.workflows' },
        },
        {
          path: 'asistente-kb',
          component: () => import('../views/KbAdminView.vue'),
          meta: { tenantOnly: true, capability: 'admin.ia' },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return '/login'
  if (to.path === '/login' && auth.isAuthenticated) {
    return auth.isPlatformAdmin ? '/suscriptores' : '/'
  }
  if (to.meta.platformOnly && !auth.isPlatformAdmin) return '/'
  if (to.meta.tenantOnly && auth.isPlatformAdmin) return '/suscriptores'

  const needed = to.meta.capability || capabilityForRoute(to.path)
  if (needed && !auth.can(needed)) return '/'

  return true
})

export default router
