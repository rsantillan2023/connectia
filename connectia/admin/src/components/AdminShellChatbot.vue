<script setup>
/**
 * Rail chatbot Admin — UX/UI paridad Hiryx Chatbot (alwaysOpen):
 * colapsar · ampliar · maximizar (modal) · reiniciar · ayudas rápidas · KB vía /api/assistant.
 * Colores: tokens --panel / --ink / --brand (oscuro y claro).
 */
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PRODUCT_ICON, PRODUCT_NAME } from '../constants/brand'
import api from '../services/api'

const props = defineProps({
  collapsed: { type: Boolean, default: true },
})
const emit = defineEmits(['update:collapsed'])

const router = useRouter()
const CHANNEL = 'a'

const draft = ref('')
const draftMax = ref('')
const messages = ref([])
const conversationId = ref(null)
const busy = ref(false)
const error = ref('')
const aiConfigured = ref(false)
const threadEl = ref(null)
const threadMaxEl = ref(null)
const messageInput = ref(null)
const maximizedInput = ref(null)
const maximizedPanelRef = ref(null)
const isMaximized = ref(false)
const quickHelpExpanded = ref(false)

const QUICK_HELPS = [
  '¿Dónde gestiono usuarios?',
  '¿Cómo publico en el muro?',
  '¿Dónde está la bandeja de solicitudes?',
  '¿Cómo configuro el menú de la app?',
  '¿Dónde veo licencias y ausentismos?',
  '¿Cómo edito la base de conocimientos?',
  '¿Dónde configuro notificaciones?',
  '¿Cómo asigno roles y permisos?',
  '¿Dónde gestiono documentos?',
  '¿Cómo configuro beneficios?',
  '¿Dónde veo reportes?',
  '¿Cómo edito el branding de la comunidad?',
]

const welcomeFallback = {
  role: 'assistant',
  text: `Hola — soy el asistente de ${PRODUCT_NAME} Admin. Consulto la base de conocimientos y te indico dónde está cada función.`,
  links: [
    { label: 'Base de conocimientos', href: '/asistente-kb' },
    { label: 'Usuarios', href: '/usuarios' },
  ],
}

function expand() {
  emit('update:collapsed', false)
  nextTick(() => {
    scrollBottom()
    messageInput.value?.focus?.()
  })
}

function collapse() {
  isMaximized.value = false
  emit('update:collapsed', true)
}

function toggle() {
  if (props.collapsed) expand()
  else collapse()
}

function maximizeChat() {
  isMaximized.value = true
  nextTick(() => {
    scrollBottomMax()
    maximizedInput.value?.focus?.()
  })
}

function closeMaximized() {
  isMaximized.value = false
  nextTick(() => messageInput.value?.focus?.())
}

function openMaximized() {
  emit('update:collapsed', false)
  nextTick(() => maximizeChat())
}

function toggleQuickHelp() {
  quickHelpExpanded.value = !quickHelpExpanded.value
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderMd(text) {
  let t = escapeHtml(text)
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\n/g, '<br>')
  return t
}

function applyConversation(conv) {
  if (!conv) return
  conversationId.value = conv.id
  messages.value = (conv.messages || []).map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    text: m.text,
    sources: m.sources || [],
    links: m.links || [],
  }))
  aiConfigured.value = Boolean(conv.aiConfigured)
  nextTick(() => {
    scrollBottom()
    if (isMaximized.value) scrollBottomMax()
  })
}

function scrollBottom() {
  const el = threadEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function scrollBottomMax() {
  const el = threadMaxEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function go(href) {
  if (!href) return
  const path = String(href).startsWith('/') ? href : `/${href}`
  if (isMaximized.value) closeMaximized()
  router.push(path).catch(() => {})
}

async function bootstrap() {
  busy.value = true
  error.value = ''
  try {
    const { data: st } = await api.get('/assistant/status')
    aiConfigured.value = Boolean(st.aiConfigured)
    const { data } = await api.get('/assistant/conversations', { params: { channel: CHANNEL } })
    const first = data.items?.[0]
    if (first?.id) {
      const { data: one } = await api.get(`/assistant/conversations/${first.id}`, {
        params: { channel: CHANNEL },
      })
      applyConversation(one.conversation)
    } else {
      messages.value = [welcomeFallback]
    }
  } catch (e) {
    messages.value = [welcomeFallback]
    error.value = e.response?.data?.error || e.message || 'No se pudo cargar el asistente'
  } finally {
    busy.value = false
  }
}

async function sendFrom(source) {
  const box = source === 'max' ? draftMax : draft
  const t = box.value.trim()
  if (!t || busy.value) return
  box.value = ''
  busy.value = true
  error.value = ''
  messages.value.push({ role: 'user', text: t })
  nextTick(() => {
    scrollBottom()
    if (isMaximized.value) scrollBottomMax()
  })
  try {
    const { data } = await api.post('/assistant/messages', {
      text: t,
      conversationId: conversationId.value,
      channel: CHANNEL,
    })
    applyConversation(data.conversation)
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      text: e.response?.data?.error || e.message || 'No pude responder. Probá de nuevo.',
    })
    error.value = e.response?.data?.error || e.message || 'Error al enviar'
  } finally {
    busy.value = false
    nextTick(() => {
      scrollBottom()
      if (isMaximized.value) {
        scrollBottomMax()
        maximizedInput.value?.focus?.()
      } else {
        messageInput.value?.focus?.()
      }
    })
  }
}

async function send() {
  await sendFrom('main')
}

async function sendMax() {
  await sendFrom('max')
}

async function sendQuickQuestion(question) {
  if (busy.value || !question) return
  draft.value = question
  await send()
}

function resetChat() {
  conversationId.value = null
  messages.value = [welcomeFallback]
  error.value = ''
  draft.value = ''
  draftMax.value = ''
}

function onMaximizedPointerOutside(e) {
  if (!isMaximized.value) return
  const panel = maximizedPanelRef.value
  if (panel && !panel.contains(e.target)) closeMaximized()
}

function onExpandChatbotEvent() {
  openMaximized()
}

function onKeydown(e) {
  if (e.key === 'Escape' && isMaximized.value) {
    e.preventDefault()
    closeMaximized()
  }
}

watch(
  () => props.collapsed,
  (c) => {
    if (!c) nextTick(scrollBottom)
  },
)

watch(isMaximized, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onMaximizedPointerOutside, true)
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('pointerdown', onMaximizedPointerOutside, true)
    document.removeEventListener('keydown', onKeydown)
  }
})

onMounted(() => {
  bootstrap()
  window.addEventListener('expand-chatbot', onExpandChatbotEvent)
})

onUnmounted(() => {
  window.removeEventListener('expand-chatbot', onExpandChatbotEvent)
  document.removeEventListener('pointerdown', onMaximizedPointerOutside, true)
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ expand, collapse, toggle, resetChat, maximizeChat, openMaximized, closeMaximized })
</script>

<template>
  <div class="admin-chat flex h-full min-h-0 flex-col">
    <button
      v-if="collapsed"
      type="button"
      class="admin-chat__rail-btn group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 border-0 bg-transparent py-2 transition-all"
      title="Ampliar chat — Asistente"
      aria-label="Ampliar asistente"
      @click="expand"
    >
      <i class="admin-chat__rail-ico fas fa-comment-dots text-xl transition-opacity group-hover:opacity-90" aria-hidden="true"></i>
      <span class="admin-chat__rail-label writing-mode-vertical text-sm font-bold tracking-wide transition-colors">
        ASISTENTE — ¿Necesitás ayuda?
      </span>
    </button>

    <template v-else>
      <header class="admin-chat__head flex flex-shrink-0 items-center justify-between border-b p-3">
        <div class="flex min-w-0 items-center gap-2">
          <div class="admin-chat__avatar flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded">
            <img :src="PRODUCT_ICON" alt="" class="h-full w-full object-cover" />
          </div>
          <div class="min-w-0">
            <h3 class="admin-chat__title truncate text-xs font-semibold">Asistente {{ PRODUCT_NAME }}</h3>
            <p class="admin-chat__subtitle truncate text-[10px]">
              {{ aiConfigured ? 'IA + base de conocimientos' : 'Base de conocimientos' }}
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-1">
          <button
            type="button"
            class="admin-chat__icon-btn rounded p-1.5 transition-colors"
            title="Reiniciar conversación"
            aria-label="Reiniciar conversación"
            :disabled="busy"
            @click="resetChat"
          >
            <i class="fas fa-redo text-sm" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="admin-chat__icon-btn rounded p-1.5 transition-colors"
            title="Maximizar chat"
            aria-label="Maximizar chat"
            @click="maximizeChat"
          >
            <i class="fas fa-expand-arrows-alt text-sm" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="admin-chat__icon-btn rounded p-1.5 transition-colors"
            title="Reducir chat"
            aria-label="Reducir chat"
            @click="collapse"
          >
            <i class="fas fa-compress text-sm" aria-hidden="true"></i>
          </button>
        </div>
      </header>

      <div
        ref="threadEl"
        class="admin-chat__thread min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
        :class="quickHelpExpanded ? 'max-h-[420px]' : ''"
      >
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="flex items-start"
          :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            v-if="m.role === 'assistant'"
            class="admin-chat__avatar mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded"
          >
            <img :src="PRODUCT_ICON" alt="" class="h-full w-full object-cover" />
          </div>
          <div
            v-if="m.role === 'user'"
            class="admin-chat__bubble admin-chat__bubble--user relative max-w-[80%] rounded-lg px-3 py-2 text-[11px] leading-relaxed"
          >
            <div class="whitespace-pre-wrap" v-html="renderMd(m.text)" />
          </div>
          <div v-else class="admin-chat__bubble admin-chat__bubble--bot max-w-[80%] rounded-lg border px-3 py-2 text-xs leading-relaxed">
            <div class="whitespace-pre-wrap" v-html="renderMd(m.text)" />
            <div v-if="m.sources?.length" class="mt-2 flex flex-wrap gap-1">
              <span class="admin-chat__meta w-full text-[10px] font-semibold uppercase tracking-wide">Fuentes</span>
              <button
                v-for="(s, si) in m.sources.slice(0, 4)"
                :key="si"
                type="button"
                class="admin-chat__chip admin-chat__chip--brand rounded-md px-2 py-0.5 text-[11px]"
                @click="go(s.href)"
              >
                {{ s.titulo || s.kind }}
              </button>
            </div>
            <div v-if="m.links?.length" class="mt-2 flex flex-wrap gap-1">
              <button
                v-for="(l, li) in m.links.slice(0, 5)"
                :key="li"
                type="button"
                class="admin-chat__chip rounded-md px-2 py-0.5 text-[11px]"
                @click="go(l.href)"
              >
                {{ l.label }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="busy" class="flex items-start justify-start">
          <div class="admin-chat__avatar mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded">
            <img :src="PRODUCT_ICON" alt="" class="h-full w-full object-cover" />
          </div>
          <div class="admin-chat__typing flex items-center gap-1.5 rounded-lg border px-3 py-2">
            <span class="admin-chat__dot h-2 w-2 animate-bounce rounded-full" style="animation-delay: 0s" />
            <span class="admin-chat__dot h-2 w-2 animate-bounce rounded-full" style="animation-delay: 0.2s" />
            <span class="admin-chat__dot h-2 w-2 animate-bounce rounded-full" style="animation-delay: 0.4s" />
          </div>
        </div>
      </div>

      <p v-if="error" class="admin-chat__error px-3 pb-1 text-[11px]" role="alert">{{ error }}</p>

      <div class="admin-chat__composer flex-shrink-0 border-t p-3">
        <form class="flex items-center gap-2" @submit.prevent="send">
          <input
            ref="messageInput"
            v-model="draft"
            type="text"
            class="admin-chat__input min-w-0 flex-1 rounded-lg border-none px-3 py-2 text-[11px] outline-none"
            placeholder="Escribí un mensaje…"
            autocomplete="off"
            :disabled="busy"
          />
          <button
            type="submit"
            class="admin-chat__send rounded-lg px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="busy || !draft.trim()"
            aria-label="Enviar"
          >
            <i class="fas fa-paper-plane" aria-hidden="true"></i>
          </button>
        </form>
      </div>

      <div class="admin-chat-helps w-full flex-none border-t p-2">
        <button
          type="button"
          class="admin-chat-helps__toggle flex w-full items-center justify-between gap-1.5 rounded px-3 py-1.5 text-left text-white transition-opacity hover:opacity-95"
          :aria-expanded="quickHelpExpanded"
          :title="quickHelpExpanded ? 'Ocultar atajos' : 'Mostrar atajos de ayuda'"
          @click="toggleQuickHelp"
        >
          <span class="flex min-w-0 items-center gap-1.5">
            <i class="fas fa-comments text-xs text-white" aria-hidden="true"></i>
            <span class="text-xs font-medium text-white">Ayudas rápidas</span>
          </span>
          <i
            class="fas text-xs text-white"
            :class="quickHelpExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
            aria-hidden="true"
          />
        </button>
        <div
          v-show="quickHelpExpanded"
          class="mt-1.5 max-h-[calc(100vh-320px)] space-y-1 overflow-y-auto pr-1"
        >
          <button
            v-for="q in QUICK_HELPS"
            :key="q"
            type="button"
            class="admin-chat-helps__item flex w-full cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors disabled:opacity-50"
            :disabled="busy"
            @click="sendQuickQuestion(q)"
          >
            <span class="text-xs">
              <span class="admin-chat__meta mr-1.5">•</span>{{ q }}
            </span>
          </button>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="isMaximized"
        class="admin-chat-max fixed inset-0 z-[100000] flex items-start justify-center px-4 pb-6 pt-24"
        role="dialog"
        aria-modal="true"
        aria-label="Asistente Admin (vista ampliada)"
      >
        <div class="admin-chat-max__backdrop absolute inset-0" aria-hidden="true" />
        <div
          ref="maximizedPanelRef"
          class="admin-chat-max__panel relative z-10 flex h-[80vh] w-full max-w-4xl flex-col rounded-lg shadow-2xl"
        >
          <header class="admin-chat__head flex items-center justify-between rounded-t-lg border-b p-4">
            <div class="flex items-center gap-2">
              <div class="admin-chat__avatar flex h-8 w-8 items-center justify-center overflow-hidden rounded">
                <img :src="PRODUCT_ICON" alt="" class="h-full w-full object-cover" />
              </div>
              <div>
                <h3 class="admin-chat__title text-sm font-semibold">Asistente {{ PRODUCT_NAME }}</h3>
                <p class="admin-chat__subtitle text-xs">vista ampliada · {{ aiConfigured ? 'IA + KB' : 'KB' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="admin-chat__btn-outline inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                title="Reiniciar conversación"
                :disabled="busy"
                @click="resetChat"
              >
                <i class="fas fa-redo text-sm" aria-hidden="true"></i>
                <span>Reiniciar</span>
              </button>
              <button
                type="button"
                class="admin-chat__btn-outline inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                title="Cerrar"
                @click="closeMaximized"
              >
                <i class="fas fa-times text-sm" aria-hidden="true"></i>
                <span>Cerrar</span>
              </button>
            </div>
          </header>

          <div ref="threadMaxEl" class="admin-chat__thread flex-1 space-y-3 overflow-y-auto p-4">
            <div
              v-for="(m, i) in messages"
              :key="'max-' + i"
              class="flex items-start"
              :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                v-if="m.role === 'assistant'"
                class="admin-chat__avatar mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded"
              >
                <img :src="PRODUCT_ICON" alt="" class="h-full w-full object-cover" />
              </div>
              <div
                v-if="m.role === 'user'"
                class="admin-chat__bubble admin-chat__bubble--user max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed"
              >
                <div class="whitespace-pre-wrap" v-html="renderMd(m.text)" />
              </div>
              <div
                v-else
                class="admin-chat__bubble admin-chat__bubble--bot max-w-[75%] rounded-lg border px-4 py-3 text-sm leading-relaxed"
              >
                <div class="whitespace-pre-wrap" v-html="renderMd(m.text)" />
                <div v-if="m.sources?.length" class="mt-2 flex flex-wrap gap-1">
                  <button
                    v-for="(s, si) in m.sources.slice(0, 5)"
                    :key="si"
                    type="button"
                    class="admin-chat__chip admin-chat__chip--brand rounded-md px-2 py-0.5 text-xs"
                    @click="go(s.href)"
                  >
                    {{ s.titulo || s.kind }}
                  </button>
                </div>
                <div v-if="m.links?.length" class="mt-2 flex flex-wrap gap-1">
                  <button
                    v-for="(l, li) in m.links.slice(0, 6)"
                    :key="li"
                    type="button"
                    class="admin-chat__chip rounded-md px-2 py-0.5 text-xs"
                    @click="go(l.href)"
                  >
                    {{ l.label }}
                  </button>
                </div>
              </div>
            </div>
            <div v-if="busy" class="flex items-start">
              <div class="admin-chat__avatar mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded">
                <img :src="PRODUCT_ICON" alt="" class="h-full w-full object-cover" />
              </div>
              <div class="admin-chat__typing flex gap-1.5 rounded-lg border px-4 py-3">
                <span class="admin-chat__dot h-2 w-2 animate-bounce rounded-full" style="animation-delay: 0s" />
                <span class="admin-chat__dot h-2 w-2 animate-bounce rounded-full" style="animation-delay: 0.2s" />
                <span class="admin-chat__dot h-2 w-2 animate-bounce rounded-full" style="animation-delay: 0.4s" />
              </div>
            </div>
          </div>

          <form class="admin-chat__composer flex gap-2 border-t p-4" @submit.prevent="sendMax">
            <input
              ref="maximizedInput"
              v-model="draftMax"
              type="text"
              class="admin-chat__input min-w-0 flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none"
              placeholder="Escribí un mensaje…"
              autocomplete="off"
              :disabled="busy"
            />
            <button
              type="submit"
              class="admin-chat__send rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              :disabled="busy || !draftMax.trim()"
            >
              <i class="fas fa-paper-plane" aria-hidden="true"></i>
            </button>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.writing-mode-vertical {
  writing-mode: vertical-rl;
  text-orientation: sideways;
  letter-spacing: 0.5px;
  transform: rotate(180deg);
}

.admin-chat {
  background: var(--panel-2);
  color: var(--ink);
}

.admin-chat__rail-btn:hover {
  background: var(--brand-soft);
}
.admin-chat__rail-ico {
  color: var(--brand-ink);
}
.admin-chat__rail-label {
  color: var(--ink-soft);
}
.admin-chat__rail-btn:hover .admin-chat__rail-label {
  color: var(--brand-ink);
}

.admin-chat__head {
  background: var(--panel);
  border-color: var(--line);
}
.admin-chat__title {
  color: var(--ink);
}
.admin-chat__subtitle {
  color: var(--ink-soft);
}
.admin-chat__avatar {
  background: #1f2937;
}
.admin-chat__icon-btn {
  color: var(--ink-soft);
  background: transparent;
  border: 0;
}
.admin-chat__icon-btn:hover {
  background: var(--panel-2);
  color: var(--ink);
}

.admin-chat__thread {
  background: var(--panel);
}

.admin-chat__bubble--user {
  background: var(--brand);
  color: #fff;
}
.admin-chat__bubble--bot {
  background: var(--panel-2);
  border-color: var(--line);
  color: var(--ink);
}
.admin-chat__meta {
  color: var(--ink-faint);
}
.admin-chat__chip {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
}
.admin-chat__chip:hover {
  border-color: var(--brand);
  color: var(--brand-ink);
}
.admin-chat__chip--brand {
  border-color: var(--brand-line);
  background: var(--brand-soft);
  color: var(--brand-ink);
}
.admin-chat__typing {
  background: var(--panel-2);
  border-color: var(--line);
}
.admin-chat__dot {
  background: var(--brand);
}
.admin-chat__error {
  color: #f87171;
}

.admin-chat__composer,
.admin-chat-helps {
  background: var(--panel);
  border-color: var(--line);
}
.admin-chat__input {
  background: var(--panel-2);
  border-color: var(--line);
  color: var(--ink);
}
.admin-chat__input::placeholder {
  color: var(--ink-faint);
}
.admin-chat__input:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand) 45%, transparent);
}
.admin-chat__send,
.admin-chat-helps__toggle {
  background: var(--brand);
}
.admin-chat-helps__item {
  background: var(--panel);
  border-color: var(--line);
  color: var(--ink);
}
.admin-chat-helps__item:hover {
  background: var(--panel-2);
}

.admin-chat__btn-outline {
  background: var(--panel);
  border-color: var(--line);
  color: var(--ink-soft);
}
.admin-chat__btn-outline:hover {
  background: var(--panel-2);
  color: var(--ink);
}

/* Modal maximizado (Teleport → body; hereda data-theme del html) */
.admin-chat-max__backdrop {
  background: rgb(0 0 0 / 0.55);
}
.admin-chat-max__panel {
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--line);
}
</style>
