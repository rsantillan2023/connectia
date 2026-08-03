<template>
  <button
    v-if="visible"
    type="button"
    class="pts-hero"
    :class="{ compact, bridge }"
    :aria-label="`${displayLabel}: ${balanceLabel} puntos`"
    @click="$emit('open')"
  >
    <span class="pts-hero-label">{{ displayLabel }}</span>
    <span class="pts-hero-bal">
      <strong>{{ balanceLabel }}</strong>
      <small>pts</small>
      <span v-if="bridge" class="pts-hero-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path
            d="M9 5.5L15.5 12L9 18.5"
            stroke="currentColor"
            stroke-width="3.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </span>
    <span v-if="!compact && !bridge" class="pts-hero-cta">Cómo sumar →</span>
  </button>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useUiText } from '../composables/useUiText'

const props = defineProps({
  compact: { type: Boolean, default: false },
  /** Barra fina a caballo entre enlaces e historias del muro. */
  bridge: { type: Boolean, default: false },
})
defineEmits(['open'])

const auth = useAuthStore()
const { t } = useUiText()
const balance = ref(null)
const loaded = ref(false)

/** Caps de sesión: el login las pone en user (no en tenant). */
function sessionCaps() {
  const u = auth.user?.capabilities || []
  const tCaps = auth.tenant?.capabilities || []
  return [...new Set([...u, ...tCaps])]
}

const visible = computed(() => {
  const caps = sessionCaps()
  return caps.includes('beneficios.billetera') || caps.includes('beneficios')
})

const canLoadWallet = computed(() => sessionCaps().includes('beneficios.billetera'))

const personName = computed(() => {
  const u = auth.user || {}
  const full = String(u.nombre || '').trim()
  if (full) return full.split(/\s+/)[0]
  const user = String(u.usuario || '').trim()
  if (user) return user
  return ''
})

const balanceLabel = computed(() => {
  if (balance.value == null) return loaded.value ? '0' : '…'
  try {
    return new Intl.NumberFormat('es-AR').format(balance.value)
  } catch {
    return String(balance.value)
  }
})

const label = computed(() => t('Mis puntos'))

const displayLabel = computed(() => {
  if (props.bridge && personName.value) return `Hola ${personName.value}`
  return label.value
})

async function load() {
  if (!visible.value) {
    balance.value = null
    loaded.value = false
    return
  }
  if (!canLoadWallet.value) {
    balance.value = 0
    loaded.value = true
    return
  }
  try {
    const { data } = await api.get('/wallet/points')
    const n = Number(data?.balance)
    balance.value = Number.isFinite(n) ? n : 0
  } catch {
    balance.value = 0
  } finally {
    loaded.value = true
  }
}

onMounted(load)
watch(
  () => [auth.tenant?.id, auth.user?.id, visible.value, canLoadWallet.value],
  () => load(),
)

defineExpose({ reload: load, balance })
</script>

<style scoped>
.pts-hero {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 12px 14px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--brand-primary, #0f766e) 88%, #000), var(--brand-primary, #0f766e));
  color: #fff;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}
.pts-hero.compact {
  width: auto;
  padding: 6px 10px;
  border-radius: 999px;
  gap: 6px;
}
.pts-hero.bridge {
  width: 100%;
  min-height: 48px;
  padding: 12px 18px;
  border-radius: 14px;
  gap: 12px;
  background: color-mix(
    in srgb,
    var(--brand-primary, #0f766e) var(--brand-points-keep, 78%),
    #000
  );
  color: #fff;
  border: 2px solid color-mix(in srgb, var(--brand-primary, #0f766e) 55%, #fff);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--brand-primary, #0f766e) 40%, transparent);
  box-sizing: border-box;
}
.pts-hero-label {
  font-size: 11px;
  opacity: 0.9;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.pts-hero.compact .pts-hero-label {
  display: none;
}
.pts-hero.bridge .pts-hero-label {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 650;
  text-transform: none;
  letter-spacing: 0;
  opacity: 1;
  color: #fff;
  text-align: left;
}
.pts-hero-bal {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}
.pts-hero-bal strong {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1;
  color: #fff;
}
.pts-hero.compact .pts-hero-bal strong {
  font-size: 0.95rem;
}
.pts-hero.bridge .pts-hero-bal {
  gap: 6px;
  margin-left: 0;
}
.pts-hero.bridge .pts-hero-bal strong {
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
  color: #fff;
}
.pts-hero-bal small {
  font-size: 11px;
  opacity: 0.85;
  color: #fff;
}
.pts-hero.bridge .pts-hero-bal small {
  color: #fff;
  opacity: 0.9;
  font-size: 0.8rem;
}
.pts-hero-arrow {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: color-mix(in srgb, #fff 22%, transparent);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
}
.pts-hero.bridge .pts-hero-arrow {
  width: 28px;
  height: 28px;
  background: transparent;
  color: #fff;
}
.pts-hero.bridge .pts-hero-arrow svg {
  display: block;
}
.pts-hero-cta {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.95;
  white-space: nowrap;
}
</style>
