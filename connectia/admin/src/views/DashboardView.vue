<template>
  <div class="dash">
    <header class="dash-head">
      <div>
        <h1>{{ data?.mode === 'platform' ? 'Dashboard plataforma' : 'Dashboard' }}</h1>
        <p>
          {{
            data?.mode === 'platform'
              ? 'Resumen del operador / vendedor.'
              : `Resumen de ${data?.tenant?.nombre || 'tu comunidad'} (${data?.tenant?.empCodigo || '—'}).`
          }}
        </p>
        <ScreenHelp
          v-if="data?.mode === 'platform'"
          purpose="Da una foto rápida del negocio: cuántas comunidades hay, cuáles están activas y el volumen de usuarios."
          can-do="Consultar métricas globales. Desde el menú lateral entrás a Suscriptores u otras funciones de plataforma."
        />
        <ScreenHelp
          v-else
          purpose="Estado operativo de la comunidad: contenido, solicitudes, avisos, saludos, chat, aprobaciones y recursos."
          can-do="Revisar métricas y saltar a cada módulo según tus permisos."
        />
      </div>
    </header>

    <p v-if="error" class="dash-err">{{ error }}</p>
    <p v-else-if="!data" class="dash-muted">Cargando…</p>

    <template v-else-if="data.mode === 'platform'">
      <section class="dash-kpis">
        <article class="kpi">
          <p class="kpi-label">Suscriptores</p>
          <p class="kpi-value">{{ data.metrics.tenants }}</p>
        </article>
        <article class="kpi">
          <p class="kpi-label">Activos</p>
          <p class="kpi-value">{{ data.metrics.activeTenants }}</p>
        </article>
        <article class="kpi">
          <p class="kpi-label">Usuarios totales</p>
          <p class="kpi-value">{{ data.metrics.users }}</p>
        </article>
      </section>
      <RouterLink to="/suscriptores" class="dash-link">Ir a Suscriptores →</RouterLink>
    </template>

    <template v-else>
      <section class="dash-kpis">
        <article v-if="show('admin.usuarios')" class="kpi">
          <p class="kpi-label">Usuarios</p>
          <p class="kpi-value">{{ m.activeUsers }} <span class="kpi-sub">/ {{ m.users }}</span></p>
          <p class="kpi-hint">activos / total</p>
        </article>
        <article v-if="show('admin.solicitudes')" class="kpi accent">
          <p class="kpi-label">Solicitudes abiertas</p>
          <p class="kpi-value">{{ m.requestsOpen }}</p>
          <p class="kpi-hint">{{ m.requestsTotal }} en total</p>
        </article>
        <article v-if="show('admin.workflows')" class="kpi accent">
          <p class="kpi-label">Aprobaciones en curso</p>
          <p class="kpi-value">{{ m.approvalsOpen ?? 0 }}</p>
          <p class="kpi-hint">{{ m.workflowsActive ?? 0 }} flujos activos</p>
        </article>
        <article v-if="show('admin.publicaciones')" class="kpi">
          <p class="kpi-label">Publicaciones</p>
          <p class="kpi-value">{{ m.postsPublished }}</p>
          <p class="kpi-hint">
            {{ m.postsDraft }} en borrador
            <template v-if="(m.postsPendingModeration || 0) > 0">
              · {{ m.postsPendingModeration }} en moderación
            </template>
          </p>
        </article>
        <article v-if="show('admin.encuestas')" class="kpi">
          <p class="kpi-label">Encuestas abiertas</p>
          <p class="kpi-value">{{ m.surveysOpen }}</p>
          <p class="kpi-hint">{{ m.surveysTotal }} en total</p>
        </article>
        <article v-if="show('admin.notificaciones')" class="kpi">
          <p class="kpi-label">Campañas programadas</p>
          <p class="kpi-value">{{ m.notificationsScheduled ?? 0 }}</p>
          <p class="kpi-hint">{{ m.notificationsSent ?? 0 }} enviadas</p>
        </article>
        <article v-if="show('admin.saludos')" class="kpi">
          <p class="kpi-label">Reglas de saludo</p>
          <p class="kpi-value">{{ m.greetingRulesActive ?? 0 }}</p>
          <p class="kpi-hint">activas</p>
        </article>
        <article v-if="show('admin.comentarios')" class="kpi" :class="{ accent: (m.commentsPending || 0) > 0 }">
          <p class="kpi-label">Comentarios pendientes</p>
          <p class="kpi-value">{{ m.commentsPending ?? 0 }}</p>
          <p class="kpi-hint">en revisión</p>
        </article>
        <article v-if="show('admin.chat')" class="kpi" :class="{ accent: (m.chatReportsOpen || 0) > 0 }">
          <p class="kpi-label">Denuncias de chat</p>
          <p class="kpi-value">{{ m.chatReportsOpen ?? 0 }}</p>
          <p class="kpi-hint">abiertas</p>
        </article>
        <article v-if="show('admin.documentos')" class="kpi">
          <p class="kpi-label">Documentos</p>
          <p class="kpi-value">{{ m.docsPublished }}</p>
          <p class="kpi-hint">publicados</p>
        </article>
        <article v-if="show('admin.hub')" class="kpi">
          <p class="kpi-label">Enlaces</p>
          <p class="kpi-value">{{ m.hubLinks }}</p>
          <p class="kpi-hint">activos en el hub</p>
        </article>
        <article v-if="show('admin.organizacion')" class="kpi">
          <p class="kpi-label">Organización</p>
          <p class="kpi-value">{{ m.orgAreas }} <span class="kpi-sub">/ {{ m.orgGroups }}</span></p>
          <p class="kpi-hint">áreas / grupos</p>
        </article>
        <article class="kpi">
          <p class="kpi-label">Desktop</p>
          <p class="kpi-value sm">{{ m.allowDesktop ? 'Permitido' : 'Bloqueado' }}</p>
          <p class="kpi-hint">{{ m.menuItems }} ítems de menú</p>
        </article>
      </section>

      <section v-for="group in shortcutGroups" :key="group.id" class="dash-group">
        <h2>{{ group.label }}</h2>
        <div class="dash-shortcuts">
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="shortcut"
          >
            <strong>{{ item.label }}</strong>
            <span>{{ item.hint }}</span>
          </RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const data = ref(null)
const error = ref('')

const m = computed(() => data.value?.metrics || {})

function show(cap) {
  return auth.can(cap)
}

const ALL_SHORTCUTS = [
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    items: [
      { to: '/solicitudes', label: 'Bandeja', hint: 'Trámites abiertos y seguimiento', cap: 'admin.solicitudes' },
      { to: '/enviar-solicitud', label: 'Pedir datos a un grupo', hint: 'Pedido con formulario a varias personas', cap: 'admin.solicitudes' },
      { to: '/tipos-solicitud', label: 'Plantillas', hint: 'Modelos de pedido y preguntas', cap: 'admin.tipos-solicitud' },
      { to: '/estados-solicitud', label: 'Estados', hint: 'Ciclo de vida de las solicitudes', cap: 'admin.solicitudes' },
      { to: '/workflows', label: 'Flujos de Aprobación', hint: 'Diseñador y bandeja de aprobaciones', cap: 'admin.workflows' },
    ],
  },
  {
    id: 'personas',
    label: 'Personas',
    items: [
      { to: '/usuarios', label: 'Usuarios', hint: 'Alta, roles y pantallas', cap: 'admin.usuarios' },
      { to: '/organizacion', label: 'Organización', hint: 'Áreas y grupos de audiencia', cap: 'admin.organizacion' },
    ],
  },
  {
    id: 'contenido',
    label: 'Contenido',
    items: [
      { to: '/publicaciones', label: 'Publicaciones', hint: 'Muro, UGC y comunicados', cap: 'admin.publicaciones' },
      { to: '/encuestas', label: 'Encuestas', hint: 'Cuestionarios y resultados', cap: 'admin.encuestas' },
      { to: '/notificaciones', label: 'Notificaciones', hint: 'Campañas push e in-app', cap: 'admin.notificaciones' },
      { to: '/saludos', label: 'Saludos automáticos', hint: 'Cumpleaños y aniversarios', cap: 'admin.saludos' },
      { to: '/eventos', label: 'Eventos', hint: 'Agenda corporativa', cap: 'admin.eventos' },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis y Moderación',
    items: [
      { to: '/emociones', label: 'Emociones', hint: 'Likes, aplausos y guardados', cap: 'admin.publicaciones' },
      { to: '/newsletters', label: 'Newsletters', hint: 'Auditoría de envíos de muro', cap: 'admin.publicaciones' },
      { to: '/moderacion-comentarios', label: 'Moderación de comentarios', hint: 'Bandeja asistida por IA', cap: 'admin.comentarios' },
      { to: '/chat-moderacion', label: 'Moderación de chat', hint: 'Denuncias, retención y bloqueos', cap: 'admin.chat' },
    ],
  },
  {
    id: 'recursos',
    label: 'Recursos',
    items: [
      { to: '/documentos', label: 'Documentos', hint: 'Archivos y políticas', cap: 'admin.documentos' },
      { to: '/accesos', label: 'Enlaces', hint: 'Atajos a sistemas y URLs', cap: 'admin.hub' },
    ],
  },
  {
    id: 'config',
    label: 'Configuración general',
    items: [
      { to: '/comunidad', label: 'Comunidad', hint: 'Branding y módulos', cap: 'admin.comunidad' },
      { to: '/menu', label: 'Menú dinámico', hint: 'Navegación app y admin', cap: 'admin.menu' },
      {
        to: '/asistente-kb',
        label: 'Base de conocimientos',
        hint: 'Artículos del asistente / chatbot',
        cap: 'admin.ia',
      },
    ],
  },
]

const shortcutGroups = computed(() =>
  ALL_SHORTCUTS.map((g) => ({
    ...g,
    items: g.items.filter((i) => auth.can(i.cap)),
  })).filter((g) => g.items.length),
)

onMounted(async () => {
  try {
    const res = await api.get('/admin/tenants/me/dashboard')
    data.value = res.data
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el dashboard'
  }
})
</script>

<style scoped>
.dash {
  max-width: 1100px;
}
.dash-head h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 650;
}
.dash-head p {
  margin: 0.35rem 0 0;
  color: var(--cx-muted);
  font-size: 0.9rem;
}
.dash-err {
  margin-top: 1rem;
  color: #b91c1c;
  font-size: 0.875rem;
}
.dash-muted {
  margin-top: 1rem;
  color: var(--cx-muted);
  font-size: 0.9rem;
}
.dash-kpis {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.85rem;
}
.kpi {
  background: var(--cx-surface);
  border: 1px solid var(--cx-border);
  border-radius: 12px;
  padding: 1rem 1.05rem;
}
.kpi.accent {
  border-color: color-mix(in srgb, var(--brand-primary) 35%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 6%, var(--cx-surface));
}
.kpi-label {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cx-muted);
}
.kpi-value {
  margin: 0.35rem 0 0;
  font-size: 1.65rem;
  font-weight: 650;
  line-height: 1.1;
}
.kpi-value.sm {
  font-size: 1.15rem;
  margin-top: 0.55rem;
}
.kpi-sub {
  font-size: 1rem;
  font-weight: 500;
  color: var(--cx-muted);
}
.kpi-hint {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--cx-muted);
}
.dash-group {
  margin-top: 1.75rem;
}
.dash-group h2 {
  margin: 0 0 0.65rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cx-muted);
}
.dash-shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.65rem;
}
.shortcut {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.shortcut:hover {
  border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--cx-border));
  background: color-mix(in srgb, var(--brand-primary) 5%, var(--cx-surface));
}
.shortcut strong {
  font-size: 0.95rem;
}
.shortcut span {
  font-size: 0.78rem;
  color: var(--cx-muted);
}
.dash-link {
  display: inline-block;
  margin-top: 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--brand-primary);
  text-decoration: none;
}
</style>
