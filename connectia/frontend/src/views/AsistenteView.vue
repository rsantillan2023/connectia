<template>
  <section class="asistente">
    <header class="as-head">
      <div class="as-brand">
        <span class="as-avatar" aria-hidden="true">
          <AppIcon name="sparkles" :size="20" />
        </span>
        <div class="as-titles">
          <h1>Asistente</h1>
          <p class="as-status">
            <span class="as-dot" :class="{ on: !busy }" />
            {{ statusLabel }}
          </p>
        </div>
      </div>
      <button
        type="button"
        class="as-icon-btn"
        title="Nueva conversación"
        aria-label="Nueva conversación"
        :disabled="busy"
        @click="newChat"
      >
        <AppIcon name="plus" :size="18" />
      </button>
    </header>

    <div ref="threadEl" class="thread">
      <!-- Empty / first paint -->
      <div v-if="!messages.length && !busy" class="welcome">
        <div class="welcome-hero">
          <span class="welcome-ico" aria-hidden="true">
            <AppIcon name="sparkles" :size="28" />
          </span>
          <h2>¿En qué te ayudo?</h2>
          <p>Escribí tu consulta o trámite; te voy preguntando lo que falte y lo confirmamos hablando.</p>
        </div>
        <div class="action-grid">
          <button
            v-for="a in quickActions"
            :key="a.id"
            type="button"
            class="action-card"
            :disabled="busy"
            @click="ask(a.prompt)"
          >
            <span class="action-ico" aria-hidden="true">
              <AppIcon :name="a.icon" :size="18" />
            </span>
            <span class="action-body">
              <strong>{{ a.title }}</strong>
              <small>{{ a.hint }}</small>
            </span>
          </button>
        </div>
      </div>

      <template v-else>
        <div
          v-for="(m, idx) in messages"
          :key="m.id"
          class="row"
          :class="{ 'is-me': m.role === 'user', 'is-bot': m.role === 'assistant' }"
        >
          <span v-if="m.role === 'assistant'" class="row-avatar" aria-hidden="true">
            <AppIcon name="sparkles" :size="14" />
          </span>
          <div class="bubble" :class="{ 'is-me': m.role === 'user', 'is-bot': m.role === 'assistant' }">
            <div class="bubble-text" v-html="renderMd(m.text)" />

            <div v-if="m.sources?.length" class="block">
              <span class="block-label">Fuentes</span>
              <div class="pills">
                <button
                  v-for="(s, i) in m.sources.slice(0, 5)"
                  :key="i"
                  type="button"
                  class="pill"
                  @click="go(s.href)"
                >
                  {{ s.titulo || s.kind }}
                </button>
              </div>
            </div>

            <div v-if="m.links?.length" class="block">
              <span class="block-label">Ir a</span>
              <div class="pills">
                <RouterLink v-for="(l, i) in m.links" :key="i" :to="l.href" class="pill pill-link">
                  {{ l.label }}
                </RouterLink>
              </div>
            </div>
          </div>
          <span
            v-if="m.role === 'assistant' && idx === messages.length - 1 && !busy"
            class="row-spacer"
            aria-hidden="true"
          />
        </div>

        <div v-if="busy" class="row is-bot">
          <span class="row-avatar" aria-hidden="true">
            <AppIcon name="sparkles" :size="14" />
          </span>
          <div class="bubble is-bot typing">
            <span class="dot" /><span class="dot" /><span class="dot" />
          </div>
        </div>
      </template>
    </div>

    <p v-if="error" class="err" role="alert">{{ error }}</p>

    <form class="composer" @submit.prevent="send">
      <div class="composer-box">
        <textarea
          ref="taEl"
          v-model="draft"
          rows="1"
          placeholder="Escribí como si hablaras con alguien…"
          :disabled="busy"
          @input="autoSize"
          @keydown.enter.exact.prevent="send"
        />
        <button
          type="submit"
          class="send"
          :disabled="busy || !draft.trim()"
          aria-label="Enviar"
        >
          <AppIcon v-if="!busy" name="share" :size="18" />
          <span v-else class="send-spin" aria-hidden="true" />
        </button>
      </div>
      <p class="composer-hint">Enter para enviar · confirmá con «sí» o cancelá con «no»</p>
    </form>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import AppIcon from '../components/AppIcon.vue'

const router = useRouter()
const conversationId = ref(null)
const messages = ref([])
const draft = ref('')
const busy = ref(false)
const bootstrapping = ref(true)
const error = ref('')
const aiConfigured = ref(false)
const threadEl = ref(null)
const taEl = ref(null)

const quickActions = [
  {
    id: 'solicitud',
    title: 'Cargar solicitud',
    hint: 'Armamos el trámite juntos',
    icon: 'inbox',
    prompt: 'Quiero cargar una solicitud',
  },
  {
    id: 'vacaciones',
    title: 'Vacaciones',
    hint: 'Pedí fechas hablando',
    icon: 'clipboard',
    prompt: 'Quiero pedir vacaciones',
  },
  {
    id: 'recibo',
    title: 'Recibo de sueldo',
    hint: 'Consulta a RRHH (sin módulo aún)',
    icon: 'file',
    prompt: 'Quiero mi recibo de sueldo',
  },
  {
    id: 'sala',
    title: 'Reservar sala',
    hint: 'Booking conversacional',
    icon: 'building',
    prompt: 'Quiero reservar una sala mañana a las 10',
  },
  {
    id: 'curso',
    title: 'En curso',
    hint: 'Estado de tus solicitudes',
    icon: 'list',
    prompt: '¿Qué solicitudes tengo en curso?',
  },
  {
    id: 'ayuda',
    title: 'Cómo hacer…',
    hint: 'Guías de la comunidad',
    icon: 'search',
    prompt: '¿Cómo creo una solicitud?',
  },
]

const statusLabel = computed(() => {
  if (busy.value) return 'Pensando…'
  if (aiConfigured.value) return 'Listo · IA + base'
  return 'Listo · base de conocimientos'
})

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderMd(text) {
  let t = escapeHtml(text)
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/^• /gm, '<span class="bullet">•</span> ')
  t = t.replace(/\n/g, '<br>')
  return t
}

function applyConversation(conv) {
  if (!conv) return
  conversationId.value = conv.id
  messages.value = conv.messages || []
  aiConfigured.value = Boolean(conv.aiConfigured)
  nextTick(scrollBottom)
}

function scrollBottom() {
  const el = threadEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function autoSize() {
  const el = taEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
}

function go(href) {
  if (!href || href === '/asistente') return
  router.push(href)
}

async function bootstrap() {
  busy.value = true
  bootstrapping.value = true
  error.value = ''
  try {
    const { data: st } = await api.get('/assistant/status')
    aiConfigured.value = Boolean(st.aiConfigured)
    const { data } = await api.get('/assistant/conversations')
    const first = data.items?.[0]
    if (first?.id) {
      const { data: one } = await api.get(`/assistant/conversations/${first.id}`)
      applyConversation(one.conversation)
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cargar el asistente'
  } finally {
    busy.value = false
    bootstrapping.value = false
  }
}

async function ask(text, silent = false) {
  const msg = String(text || '').trim()
  if (!msg || busy.value) return
  if (!silent) draft.value = ''
  nextTick(autoSize)
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/assistant/messages', {
      text: msg,
      conversationId: conversationId.value,
    })
    applyConversation(data.conversation)
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Error al enviar'
  } finally {
    busy.value = false
    nextTick(() => taEl.value?.focus())
  }
}

async function send() {
  await ask(draft.value)
}

async function newChat() {
  conversationId.value = null
  messages.value = []
  error.value = ''
  draft.value = ''
  nextTick(autoSize)
}

watch(messages, () => nextTick(scrollBottom), { deep: true })

onMounted(bootstrap)
</script>

<style scoped>
.asistente {
  --as-ink: #134e4a;
  --as-muted: #64748b;
  --as-line: color-mix(in srgb, var(--brand-primary, #0f766e) 14%, transparent);
  --as-soft: color-mix(in srgb, var(--brand-primary, #0f766e) 8%, #fff);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  background:
    radial-gradient(120% 60% at 10% -10%, color-mix(in srgb, var(--brand-primary, #0f766e) 16%, transparent), transparent 55%),
    radial-gradient(90% 50% at 100% 0%, color-mix(in srgb, var(--brand-primary, #0f766e) 10%, transparent), transparent 50%),
    #f8fafc;
}

.as-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--as-line);
  background: color-mix(in srgb, #fff 88%, transparent);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.as-brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.as-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(
    145deg,
    var(--brand-primary, #0f766e),
    color-mix(in srgb, var(--brand-primary, #0f766e) 65%, #0f172a)
  );
  box-shadow: 0 6px 14px color-mix(in srgb, var(--brand-primary, #0f766e) 35%, transparent);
}

.as-titles {
  min-width: 0;
}

.as-titles h1 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--as-ink);
  font-family: var(--font-display, inherit);
}

.as-status {
  margin: 0.1rem 0 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--as-muted);
}

.as-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3b8;
}
.as-dot.on {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
}

.as-icon-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--as-line);
  border-radius: 11px;
  background: #fff;
  color: var(--brand-primary, #0f766e);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.as-icon-btn:disabled {
  opacity: 0.45;
}

.thread {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.85rem 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  scroll-behavior: smooth;
}

.welcome {
  margin: auto 0;
  padding: 0.5rem 0 1rem;
  animation: as-in 0.35s ease both;
}

.welcome-hero {
  text-align: center;
  margin-bottom: 1.1rem;
}

.welcome-ico {
  width: 56px;
  height: 56px;
  margin: 0 auto 0.75rem;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(
    145deg,
    var(--brand-primary, #0f766e),
    color-mix(in srgb, var(--brand-primary, #0f766e) 55%, #115e59)
  );
  box-shadow: 0 10px 24px color-mix(in srgb, var(--brand-primary, #0f766e) 30%, transparent);
}

.welcome-hero h2 {
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
  letter-spacing: -0.03em;
  color: var(--as-ink);
  font-family: var(--font-display, inherit);
}

.welcome-hero p {
  margin: 0 auto;
  max-width: 18rem;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--as-muted);
}

.action-grid {
  display: grid;
  gap: 0.55rem;
}

.action-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  text-align: left;
  border: 1px solid var(--as-line);
  background: #fff;
  border-radius: 14px;
  padding: 0.8rem 0.9rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.action-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--brand-primary, #0f766e) 35%, transparent);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}
.action-card:disabled {
  opacity: 0.5;
}

.action-ico {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--brand-primary, #0f766e);
  background: var(--as-soft);
}

.action-body {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}
.action-body strong {
  font-size: 0.92rem;
  color: #0f172a;
}
.action-body small {
  font-size: 0.78rem;
  color: var(--as-muted);
}

.row {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  max-width: 100%;
  animation: as-in 0.28s ease both;
}
.row.is-me {
  justify-content: flex-end;
}
.row.is-bot {
  justify-content: flex-start;
}

.row-avatar {
  width: 26px;
  height: 26px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #fff;
  background: var(--brand-primary, #0f766e);
  margin-bottom: 2px;
}

.row-spacer {
  width: 26px;
  flex-shrink: 0;
}

.bubble {
  max-width: min(88%, 34rem);
  padding: 0.75rem 0.9rem;
  border-radius: 1.05rem;
  font-size: 0.92rem;
  line-height: 1.5;
}
.bubble.is-me {
  background: var(--brand-primary, #0f766e);
  color: #fff;
  border-bottom-right-radius: 0.3rem;
  box-shadow: 0 6px 14px color-mix(in srgb, var(--brand-primary, #0f766e) 28%, transparent);
}
.bubble.is-bot {
  background: #fff;
  color: #1e293b;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-bottom-left-radius: 0.3rem;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}

.bubble-text {
  margin: 0;
  word-break: break-word;
}
.bubble-text :deep(strong) {
  font-weight: 750;
}
.bubble-text :deep(.bullet) {
  color: color-mix(in srgb, var(--brand-primary, #0f766e) 70%, #64748b);
}

.bubble.is-me .bubble-text :deep(.bullet) {
  color: rgba(255, 255, 255, 0.85);
}

.block {
  margin-top: 0.65rem;
}
.block-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--as-muted);
  margin-bottom: 0.35rem;
}
.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.pill,
.pill-link {
  font-size: 0.74rem;
  font-weight: 650;
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--brand-primary, #0f766e) 28%, transparent);
  background: var(--as-soft);
  color: var(--brand-primary, #0f766e);
  text-decoration: none;
  cursor: pointer;
}
.pill-link:hover {
  filter: brightness(0.97);
}

.typing {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0.85rem 1rem;
  min-width: 3.2rem;
}
.typing .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 55%, #94a3b8);
  animation: as-bounce 1s ease-in-out infinite;
}
.typing .dot:nth-child(2) {
  animation-delay: 0.15s;
}
.typing .dot:nth-child(3) {
  animation-delay: 0.3s;
}

.err {
  margin: 0.25rem 1rem 0;
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.82rem;
  flex-shrink: 0;
}

.composer {
  padding: 0.55rem 1rem calc(0.65rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--as-line);
  background: color-mix(in srgb, #fff 92%, transparent);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.composer-box {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  padding: 0.35rem 0.4rem 0.35rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 1.1rem;
  background: #fff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
}

.composer textarea {
  flex: 1;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  padding: 0.55rem 0.15rem;
  font: inherit;
  font-size: 0.95rem;
  line-height: 1.35;
  max-height: 120px;
  min-height: 1.35rem;
  color: #0f172a;
}
.composer textarea::placeholder {
  color: #94a3b8;
}

.send {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: var(--brand-primary, #0f766e);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transform: rotate(-15deg);
}
.send:disabled {
  opacity: 0.4;
  cursor: default;
}
.send :deep(svg) {
  transform: rotate(15deg);
}

.send-spin {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: as-spin 0.7s linear infinite;
}

.composer-hint {
  margin: 0.4rem 0.25rem 0;
  font-size: 0.68rem;
  color: #94a3b8;
  text-align: center;
}

@keyframes as-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes as-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}
@keyframes as-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
