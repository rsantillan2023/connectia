import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/legal/:tipo',
      name: 'legal',
      component: () => import('../views/LegalView.vue'),
      meta: { public: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/ResetPasswordView.vue'),
      meta: { public: true },
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('../views/TermsView.vue'),
    },
    {
      path: '/desktop-blocked',
      name: 'desktop-blocked',
      component: () => import('../views/DesktopBlockedView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AppShell.vue'),
      children: [
        { path: '', redirect: '/muro' },
        { path: 'muro', name: 'muro', component: () => import('../views/MuroView.vue') },
        {
          path: 'muro/mias',
          name: 'mis-publicaciones',
          component: () => import('../views/MisPublicacionesView.vue'),
        },
        { path: 'muro/:id', name: 'post-detail', component: () => import('../views/PostDetailView.vue') },
        { path: 'guardados', name: 'guardados', component: () => import('../views/GuardadosView.vue') },
        { path: 'solicitudes', name: 'solicitudes', component: () => import('../views/SolicitudesView.vue') },
        { path: 'solicitudes/:id', name: 'solicitud-detail', component: () => import('../views/SolicitudDetailView.vue') },
        { path: 'licencias', name: 'licencias', component: () => import('../views/LicenciasView.vue') },
        { path: 'licencias/:id', name: 'licencia-detail', component: () => import('../views/LicenciaDetailView.vue') },
        { path: 'ausencias', name: 'ausencias', component: () => import('../views/AusenciasView.vue') },
        { path: 'ausencias/:id', name: 'ausencia-detail', component: () => import('../views/AusenciaDetailView.vue') },
        { path: 'aprobaciones', name: 'aprobaciones', component: () => import('../views/AprobacionesView.vue') },
        { path: 'encuestas', name: 'encuestas', component: () => import('../views/EncuestasView.vue') },
        {
          path: 'encuestas/:id',
          name: 'encuesta-detail',
          component: () => import('../views/EncuestaDetailView.vue'),
          meta: { hideTabbar: true },
        },
        { path: 'docs', name: 'docs', component: () => import('../views/DocumentosView.vue') },
        { path: 'directorio', name: 'directorio', component: () => import('../views/DirectorioView.vue') },
        { path: 'agenda', name: 'agenda', component: () => import('../views/AgendaView.vue') },
        {
          path: 'agenda/:id',
          name: 'evento-detail',
          component: () => import('../views/EventoDetailView.vue'),
          meta: { hideTabbar: true },
        },
        { path: 'beneficios', name: 'beneficios', component: () => import('../views/BeneficiosView.vue') },
        {
          path: 'beneficios/:id',
          name: 'beneficio-detail',
          component: () => import('../views/BeneficioDetailView.vue'),
          meta: { hideTabbar: true },
        },
        { path: 'mi-legajo', name: 'mi-legajo', component: () => import('../views/MiLegajoView.vue') },
        { path: 'bienvenida', name: 'bienvenida', component: () => import('../views/BienvenidaView.vue') },
        { path: 'ayuda', name: 'ayuda', component: () => import('../views/AyudaView.vue') },
        {
          path: 'ayuda/faq/:id',
          name: 'faq-detail',
          component: () => import('../views/FaqDetailView.vue'),
          meta: { hideTabbar: true },
        },
        {
          path: 'ayuda/tutorial/:id',
          name: 'tutorial-detail',
          component: () => import('../views/TutorialDetailView.vue'),
          meta: { hideTabbar: true },
        },
        { path: 'politicas', name: 'politicas', component: () => import('../views/PoliticasView.vue') },
        {
          path: 'politicas/:id',
          name: 'politica-detail',
          component: () => import('../views/PoliticaDetailView.vue'),
          meta: { hideTabbar: true },
        },
        { path: 'accesos', name: 'accesos', component: () => import('../views/AccesosView.vue') },
        { path: 'perfil', name: 'perfil', component: () => import('../views/PerfilView.vue') },
        { path: 'avisos', name: 'avisos', component: () => import('../views/AvisosView.vue') },
        {
          path: 'asistente',
          name: 'asistente',
          component: () => import('../views/AsistenteView.vue'),
        },
        { path: 'chat', name: 'chat', component: () => import('../views/ChatListView.vue') },
        {
          path: 'chat/:id',
          name: 'chat-detail',
          component: () => import('../views/ChatDetailView.vue'),
          meta: { hideTabbar: true },
        },
      ],
    },
  ],
})

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
}

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated && !auth.needsTerms) {
    return { path: '/muro' }
  }
  if (auth.isAuthenticated && auth.needsTerms && to.name !== 'terms' && !to.meta.public) {
    return { name: 'terms', query: { redirect: to.fullPath } }
  }
  if (
    auth.isAuthenticated &&
    auth.tenant &&
    auth.tenant.allowDesktop === false &&
    isDesktopViewport() &&
    to.name !== 'desktop-blocked'
  ) {
    return { name: 'desktop-blocked' }
  }
  return true
})

export default router
