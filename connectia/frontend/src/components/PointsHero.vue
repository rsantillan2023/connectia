<template>
  <button
    v-if="visible"
    type="button"
    class="pts-hero"
    :class="{ compact }"
    @click="$emit('open')"
  >
    <span class="pts-hero-label">{{ label }}</span>
    <span class="pts-hero-bal">
      <strong>{{ balanceLabel }}</strong>
      <small>pts</small>
    </span>
    <span v-if="!compact" class="pts-hero-cta">Cómo sumar →</span>
  </button>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useUiText } from '../composables/useUiText'

const props = defineProps({
  compact: { type: Boolean, default: false },
})
defineEmits(['open'])

const auth = useAuthStore()
const { t } = useUiText()
const balance = ref(null)
const loaded = ref(false)

const visible = computed(() => {
  const caps = auth.tenant?.capabilities || []
  return caps.includes('beneficios.billetera') || caps.includes('beneficios')
})

const balanceLabel = computed(() => (balance.value == null ? '—' : String(balance.value)))
const label = computed(() => t('Mis puntos'))

async function load() {
  if (!visible.value) return
  try {
    const { data } = await api.get('/wallet/points')
    balance.value = data.balance ?? 0
  } catch {
    balance.value = null
  } finally {
    loaded.value = true
  }
}

onMounted(load)
watch(
  () => auth.tenant?.id,
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
.pts-hero-label {
  font-size: 11px;
  opacity: 0.9;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pts-hero.compact .pts-hero-label {
  display: none;
}
.pts-hero-bal {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  margin-left: auto;
}
.pts-hero-bal strong {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1;
}
.pts-hero.compact .pts-hero-bal strong {
  font-size: 0.95rem;
}
.pts-hero-bal small {
  font-size: 11px;
  opacity: 0.85;
}
.pts-hero-cta {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.95;
  white-space: nowrap;
}
</style>
