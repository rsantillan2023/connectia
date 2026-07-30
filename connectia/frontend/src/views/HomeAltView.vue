<template>
  <!--
    HomeAlt (Ola 36-h) — propuesta UX 20–30 años.
    Análisis: la home clásica (= /muro) prioriza feed corporativo denso.
    Esta variante opt-in pone primero: saludo + puntos (hero) + strips horizontales + feed compacto.
    No modifica MuroView; se activa con tenant.homeVariant = 'genz'.
  -->
  <section class="genz">
    <header class="genz-hero">
      <div>
        <p class="genz-kicker">{{ t('Home alternativa') }}</p>
        <h1>{{ greet }}</h1>
        <p class="genz-sub">Tu día en la comunidad, sin ruido.</p>
      </div>
      <PointsHero @open="goPoints" />
    </header>

    <div class="genz-actions">
      <button type="button" class="genz-pill" @click="$router.push('/muro')">{{ t('Novedades') }}</button>
      <button type="button" class="genz-pill" @click="$router.push('/beneficios')">{{ t('Beneficios') }}</button>
      <button type="button" class="genz-pill" @click="$router.push('/chat')">{{ t('Chat') }}</button>
      <button type="button" class="genz-pill ghost" @click="preferClassic">{{ t('Usar home clásica') }}</button>
    </div>

    <p v-if="error" class="genz-err">{{ error }}</p>

    <section class="genz-block">
      <div class="genz-block-head">
        <h2>{{ t('Novedades') }}</h2>
        <button type="button" class="genz-link" @click="$router.push('/muro')">Ver todo</button>
      </div>
      <ul v-if="posts.length" class="genz-feed">
        <li v-for="p in posts" :key="p.id" @click="$router.push(`/muro/${p.id}`)">
          <p class="genz-post-title">{{ p.titulo }}</p>
          <p class="genz-post-meta">
            <span v-if="p.section">{{ p.section }} · </span>{{ p.authorName || 'Comunidad' }}
          </p>
        </li>
      </ul>
      <p v-else class="genz-muted">Todavía no hay publicaciones.</p>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useUiText } from '../composables/useUiText'
import PointsHero from '../components/PointsHero.vue'

const auth = useAuthStore()
const router = useRouter()
const { t } = useUiText()
const posts = ref([])
const error = ref('')

const greet = computed(() => {
  const n = auth.user?.nombre || auth.user?.usuario || ''
  return n ? `${t('Hola,')} ${n}` : t('Hola,')
})

function goPoints() {
  router.push({ path: '/beneficios', query: { tab: 'earn' } })
}

function preferClassic() {
  localStorage.setItem('cx_home_pref', 'classic')
  router.replace('/muro')
}

onMounted(async () => {
  try {
    const { data } = await api.get('/posts/feed', { params: { page: 1, size: 6 } })
    posts.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar el feed'
  }
})
</script>

<style scoped>
.genz {
  padding: 12px 14px 28px;
  display: grid;
  gap: 16px;
}
.genz-hero {
  display: grid;
  gap: 12px;
}
.genz-kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cx-muted, #64748b);
  font-weight: 700;
}
.genz-hero h1 {
  margin: 4px 0 0;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.genz-sub {
  margin: 4px 0 0;
  color: var(--cx-muted, #64748b);
  font-size: 0.92rem;
}
.genz-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.genz-pill {
  border: 0;
  border-radius: 999px;
  padding: 8px 14px;
  font-weight: 700;
  font-size: 13px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, #fff);
  color: var(--brand-primary, #0f766e);
  cursor: pointer;
}
.genz-pill.ghost {
  background: transparent;
  border: 1px solid var(--cx-border, #e2e8f0);
  color: var(--cx-muted, #64748b);
}
.genz-block {
  display: grid;
  gap: 8px;
}
.genz-block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.genz-block-head h2 {
  margin: 0;
  font-size: 1rem;
}
.genz-link {
  border: 0;
  background: none;
  color: var(--brand-primary, #0f766e);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.genz-feed {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.genz-feed li {
  border: 1px solid var(--cx-border, #e2e8f0);
  border-radius: 14px;
  padding: 12px;
  background: var(--cx-surface, #fff);
  cursor: pointer;
}
.genz-post-title {
  margin: 0;
  font-weight: 700;
}
.genz-post-meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--cx-muted, #64748b);
}
.genz-muted,
.genz-err {
  margin: 0;
  font-size: 13px;
}
.genz-err {
  color: #b91c1c;
}
</style>
