<template>
  <div class="mfp" :style="brandStyle">
    <p v-if="label" class="mfp-label">{{ label }}</p>
    <div class="mfp-phone">
      <header class="mfp-topbar">
        <span class="mfp-icon" aria-hidden="true">☰</span>
        <div class="mfp-brand">
          <p class="mfp-name">Connectyx</p>
          <p class="mfp-tenant">{{ tenantName }}</p>
        </div>
        <span class="mfp-icon" aria-hidden="true">⌕</span>
      </header>

      <div class="mfp-screen">
        <PostCard :post="post" :truncate="truncate" :show-more-menu="false" @open="() => {}">
          <template #actions>
            <div class="mfp-actions">
              <span
                v-for="r in reactions"
                :key="r.key"
                class="mfp-react"
                :class="{ on: post.myReaction === r.key }"
                :title="r.label"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75">
                  <template v-if="r.key === 'like'">
                    <path d="M7 11v10" />
                    <path d="M11 21h6.5a2 2 0 0 0 1.95-1.54l1.35-6A2 2 0 0 0 18.85 11H14l.7-3.2A2.2 2.2 0 0 0 12.55 5L9 11H7" />
                    <path d="M4 11h3v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" />
                  </template>
                  <path
                    v-else-if="r.key === 'love'"
                    d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
                  />
                  <template v-else>
                    <path d="M8.2 13.2V9.4a1.2 1.2 0 0 1 2.4 0v3.2" />
                    <path d="M10.6 12.6V8.6a1.2 1.2 0 0 1 2.4 0v4.4" />
                    <path d="M13 13V9.8a1.2 1.2 0 0 1 2.4 0V15c0 2.6-1.7 4.2-4.4 4.2S6.6 17.6 6.6 15v-1.4a1.2 1.2 0 0 1 2.4 0" />
                    <path d="M17.5 5.5 18 7l1.5.5L18 8l-.5 1.5L17 8l-1.5-.5L17 7z" />
                  </template>
                </svg>
                <span class="mfp-react-label">{{ r.label }}</span>
                <span>{{ post.reactions?.[r.key] || 0 }}</span>
              </span>
              <span class="mfp-react save" :class="{ on: post.saved }" title="Guardar">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75">
                  <path d="M7 3h10a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2z" />
                </svg>
              </span>
            </div>
          </template>
        </PostCard>
      </div>

      <nav class="mfp-tabs" aria-hidden="true">
        <span class="mfp-tab on">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
          Muro
        </span>
        <span class="mfp-tab">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 6h16v12H4z"/><path d="M4 13h4l2 2h4l2-2h4"/></svg>
          Solicitudes
        </span>
        <span class="mfp-tab">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 4h6v2H9z"/></svg>
          Encuestas
        </span>
        <span class="mfp-tab">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/></svg>
          Enlaces
        </span>
        <span class="mfp-tab">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          Más
        </span>
      </nav>
    </div>
    <p v-if="note" class="mfp-note">{{ note }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PostCard from './PostCard.vue'
import { useAuthStore } from '../stores/auth'

defineProps({
  post: { type: Object, required: true },
  truncate: { type: Boolean, default: true },
  label: { type: String, default: 'Así lo ve el miembro' },
  note: { type: String, default: '' },
})

const auth = useAuthStore()

const reactions = [
  { key: 'like', label: 'Me gusta' },
  { key: 'love', label: 'Me encanta' },
  { key: 'clap', label: 'Aplausos' },
]

const tenantName = computed(() => auth.tenant?.nombre || 'Comunidad')

const brandStyle = computed(() => {
  const b = auth.tenant?.branding || {}
  return {
    '--brand-primary': b.primary || 'var(--brand-primary)',
    '--brand-secondary': b.secondary || 'var(--brand-secondary)',
  }
})
</script>

<style scoped>
.mfp {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.mfp-label {
  align-self: stretch;
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cx-muted);
}

.mfp-phone {
  width: min(100%, 390px);
  border-radius: 28px;
  border: 1px solid var(--cx-border);
  background: var(--cx-page);
  overflow: hidden;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
  display: flex;
  flex-direction: column;
  max-height: min(720px, 70vh);
}

.mfp-topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--cx-surface) 92%, transparent);
  border-bottom: 1px solid var(--cx-border);
}

.mfp-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--cx-border);
  background: var(--cx-surface);
  color: var(--cx-text);
  display: grid;
  place-items: center;
  font-size: 14px;
}

.mfp-brand {
  flex: 1;
  min-width: 0;
}

.mfp-name {
  margin: 0;
  font-family: Fraunces, Georgia, serif;
  font-size: 1.2rem;
  line-height: 1.1;
  color: var(--brand-primary);
}

.mfp-tenant {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--cx-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mfp-screen {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--cx-page);
  -webkit-overflow-scrolling: touch;
}

.mfp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 2px;
  align-items: center;
}

.mfp-react {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 7px 9px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cx-muted);
}

.mfp-react-label {
  font-size: 10px;
  font-weight: 600;
}

.mfp-react.on {
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
}

.mfp-react.save {
  margin-left: auto;
}

.mfp-tabs {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
  padding: 6px 4px 10px;
  background: color-mix(in srgb, var(--cx-surface) 94%, transparent);
  border-top: 1px solid var(--cx-border);
}

.mfp-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 48px;
  font-size: 9px;
  font-weight: 600;
  color: var(--cx-muted);
  border-radius: 12px;
}

.mfp-tab.on {
  color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
}

.mfp-note {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--cx-muted);
  text-align: center;
  max-width: 36ch;
}
</style>
