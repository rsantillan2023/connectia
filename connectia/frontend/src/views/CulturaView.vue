<template>
  <section class="cul">
    <header class="cul-head">
      <h1>Cultura</h1>
      <p v-if="!moduleDisabled">Reconocimientos, marketplace interno, referidos y pulso organizacional.</p>
    </header>

    <ModuleDisabledState
      v-if="moduleDisabled"
      module-name="Cultura"
      icon="heart"
    />
    <template v-else>
      <div v-if="visibleTabs.length" class="cul-tabs" role="tablist">
        <button
          v-for="t in visibleTabs"
          :key="t.id"
          type="button"
          role="tab"
          :class="{ on: tab === t.id }"
          @click="setTab(t.id)"
        >
          {{ t.label }}
        </button>
      </div>

      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <p v-if="okMsg" class="ok">{{ okMsg }}</p>
      <p v-if="loading" class="muted">Cargando…</p>

      <!-- Reconocimientos -->
      <div v-if="!loading && tab === 'reconocimientos'" class="cul-panel">
        <form class="card form" @submit.prevent="sendRecognition">
          <h2 class="sub">Reconocer a alguien</h2>
          <PersonPicker
            v-model="recForm.toUserId"
            v-model:selected-label="recForm.toName"
            endpoint="/culture/people"
            label="Persona"
            placeholder="Buscar colega…"
          />
          <label>Valor corporativo
            <select v-model="recForm.valueId" class="input">
              <option value="">— Opcional —</option>
              <option v-for="v in values" :key="v.id" :value="v.id">{{ v.nombre }}</option>
            </select>
          </label>
          <label>Mensaje
            <textarea v-model="recForm.mensaje" class="input" rows="3" required />
          </label>
          <label v-if="walletEnabled">Puntos a regalar (opcional, máx. 100)
            <input v-model.number="recForm.points" type="number" min="0" max="100" class="input" />
          </label>
          <label class="row-check">
            <input v-model="recForm.private" type="checkbox" /> Solo visible para el destinatario (no sale en el muro)
          </label>
          <button type="submit" class="btn" :disabled="saving || !recForm.toUserId">Enviar reconocimiento</button>
        </form>

        <h2 class="sub">Feed</h2>
        <ul v-if="recognitions.length" class="cul-list">
          <li v-for="r in recognitions" :key="r.id" class="card">
            <p><strong>{{ r.fromName }}</strong> → <strong>{{ r.toName }}</strong></p>
            <span v-if="r.valueName" class="tag">{{ r.valueName }}</span>
            <p>{{ r.mensaje }}</p>
            <small class="muted">{{ fmtDate(r.createdAt) }}</small>
          </li>
        </ul>
        <p v-else class="muted center">Sin reconocimientos aún.</p>
      </div>

      <!-- Marketplace -->
      <div v-if="!loading && tab === 'marketplace'" class="cul-panel">
        <form class="card form" @submit.prevent="publishListing">
          <h2 class="sub">Publicar aviso</h2>
          <label>Título<input v-model="mpForm.titulo" class="input" required /></label>
          <label>Descripción<textarea v-model="mpForm.descripcion" class="input" rows="3" /></label>
          <label>Categoría
            <select v-model="mpForm.category" class="input">
              <option v-for="c in mpCategories" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label>Precio<input v-model="mpForm.precio" class="input" placeholder="Ej. $5000 o Canje" /></label>
          <label>Contacto<textarea v-model="mpForm.contactNote" class="input" rows="2" /></label>
          <button type="submit" class="btn" :disabled="saving">Publicar</button>
        </form>

        <ul v-if="listings.length" class="cul-list">
          <li v-for="l in listings" :key="l.id" class="card">
            <div class="card-top">
              <strong>{{ l.titulo }}</strong>
              <span class="pill">{{ l.category }}</span>
            </div>
            <p class="meta">{{ l.authorName }} · {{ l.precio || 'Consultar' }}</p>
            <p v-if="l.descripcion">{{ l.descripcion }}</p>
            <p v-if="l.contactNote" class="meta">Contacto: {{ l.contactNote }}</p>
            <button
              v-if="chatEnabled && l.authorId"
              type="button"
              class="btn ghost"
              :disabled="saving"
              @click="contactListing(l)"
            >
              Escribir por chat
            </button>
          </li>
        </ul>
        <p v-else class="muted center">Sin avisos publicados.</p>
      </div>

      <!-- Referidos -->
      <div v-if="!loading && tab === 'referidos'" class="cul-panel">
        <form class="card form" @submit.prevent="createReferral">
          <h2 class="sub">Referir candidato</h2>
          <label>ID vacante (opcional)<input v-model="refForm.vacancyId" class="input" /></label>
          <label>Nombre<input v-model="refForm.candidateName" class="input" required /></label>
          <label>Email<input v-model="refForm.candidateEmail" type="email" class="input" /></label>
          <label>Teléfono<input v-model="refForm.candidatePhone" class="input" /></label>
          <label>Notas<textarea v-model="refForm.notes" class="input" rows="2" /></label>
          <button type="submit" class="btn" :disabled="saving">Enviar referido</button>
        </form>

        <h2 class="sub">Mis referidos</h2>
        <ul v-if="referrals.length" class="cul-list">
          <li v-for="r in referrals" :key="r.id" class="card flat">
            <strong>{{ r.candidateName }}</strong>
            <span class="pill">{{ r.status }}</span>
            <p v-if="r.vacancyTitle" class="meta">Vacante: {{ r.vacancyTitle }}</p>
            <p class="meta">{{ fmtDate(r.createdAt) }}</p>
          </li>
        </ul>
        <p v-else class="muted">Sin referidos.</p>
      </div>

      <!-- Pulso -->
      <div v-if="!loading && tab === 'pulso'" class="cul-panel">
        <div v-for="c in pulseCampaigns" :key="c.id" class="card">
          <strong>{{ c.nombre }}</strong>
          <p v-if="c.descripcion" class="meta">{{ c.descripcion }}</p>
          <p class="meta">Hasta {{ fmtDate(c.endsAt) }}</p>

          <p v-if="c.answeredByMe" class="ok">Ya respondiste esta campaña.</p>
          <form v-else class="pulse-form" @submit.prevent="submitPulse(c)">
            <div v-for="(q, qi) in c.questions" :key="qi" class="q-block">
              <p>{{ q.texto }}</p>
              <div v-if="q.tipo === 'enps'" class="enps-btns">
                <button
                  v-for="n in 11"
                  :key="n - 1"
                  type="button"
                  :class="{ on: pulseAnswers[c.id]?.[qi] === n - 1 }"
                  @click="setPulseAnswer(c.id, qi, n - 1)"
                >
                  {{ n - 1 }}
                </button>
              </div>
              <div v-else-if="q.tipo === 'scale'" class="enps-btns">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  :class="{ on: pulseAnswers[c.id]?.[qi] === n }"
                  @click="setPulseAnswer(c.id, qi, n)"
                >
                  {{ n }}
                </button>
              </div>
              <textarea
                v-else
                v-model="pulseAnswers[c.id][qi]"
                class="input"
                rows="2"
                placeholder="Tu respuesta…"
              />
            </div>
            <button type="submit" class="btn" :disabled="saving">Enviar respuestas</button>
          </form>
        </div>
        <p v-if="!pulseCampaigns.length" class="muted center">No hay campañas activas.</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import ModuleDisabledState from '../components/ModuleDisabledState.vue'
import PersonPicker from '../components/PersonPicker.vue'

const router = useRouter()
const caps = ref({ reconocimientos: false, marketplace: false, referidos: false, pulso: false })
const walletEnabled = ref(false)
const chatEnabled = ref(false)
const moduleDisabled = ref(false)
const tab = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const okMsg = ref('')

const values = ref([])
const recognitions = ref([])
const recForm = ref({ toUserId: '', toName: '', valueId: '', mensaje: '', private: false, points: 0 })
const listings = ref([])
const mpCategories = ref(['venta', 'regalo', 'servicio', 'otro'])
const mpForm = ref({ titulo: '', descripcion: '', category: 'venta', precio: '', contactNote: '' })
const referrals = ref([])
const refForm = ref({ vacancyId: '', candidateName: '', candidateEmail: '', candidatePhone: '', notes: '' })
const pulseCampaigns = ref([])
const pulseAnswers = reactive({})

const TAB_DEF = [
  { id: 'reconocimientos', cap: 'reconocimientos', label: 'Reconocimientos' },
  { id: 'marketplace', cap: 'marketplace', label: 'Marketplace' },
  { id: 'referidos', cap: 'referidos', label: 'Referidos' },
  { id: 'pulso', cap: 'pulso', label: 'Pulso' },
]

const visibleTabs = computed(() => TAB_DEF.filter((t) => caps.value[t.cap]))

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('es-AR') } catch { return '' }
}

function handleErr(e, fallback) {
  if (e.response?.status === 403) {
    moduleDisabled.value = true
    error.value = ''
    return true
  }
  error.value = e.response?.data?.error || fallback
  return false
}

async function loadMeta() {
  try {
    const { data } = await api.get('/culture/meta')
    caps.value = data.capabilities || {}
    walletEnabled.value = Boolean(data.wallet)
    chatEnabled.value = Boolean(data.chat)
    if (data.marketplaceCategories?.length) mpCategories.value = data.marketplaceCategories
    moduleDisabled.value = false
    const first = visibleTabs.value[0]
    if (first && !tab.value) tab.value = first.id
  } catch (e) {
    if (e.response?.status === 403) {
      moduleDisabled.value = true
      error.value = ''
    } else {
      error.value = e.response?.data?.error || 'No se pudo cargar el módulo'
    }
  }
}

async function loadTabData() {
  if (moduleDisabled.value || !tab.value) return
  loading.value = true
  error.value = ''
  okMsg.value = ''
  try {
    if (tab.value === 'reconocimientos') {
      const [vals, recs] = await Promise.all([
        api.get('/culture/values'),
        api.get('/culture/recognitions'),
      ])
      values.value = vals.data.items || []
      recognitions.value = recs.data.items || []
    } else if (tab.value === 'marketplace') {
      const { data } = await api.get('/culture/marketplace')
      listings.value = data.items || []
      if (typeof data.chatEnabled === 'boolean') chatEnabled.value = data.chatEnabled
    } else if (tab.value === 'referidos') {
      const { data } = await api.get('/culture/referrals/mine')
      referrals.value = data.items || []
    } else if (tab.value === 'pulso') {
      const { data } = await api.get('/culture/pulse')
      pulseCampaigns.value = data.items || []
      for (const c of pulseCampaigns.value) {
        if (!pulseAnswers[c.id]) pulseAnswers[c.id] = c.questions.map(() => '')
      }
    }
  } catch (e) {
    handleErr(e, 'Error al cargar datos')
  } finally {
    loading.value = false
  }
}

function setTab(id) {
  tab.value = id
  loadTabData()
}

function setPulseAnswer(campaignId, qi, val) {
  if (!pulseAnswers[campaignId]) pulseAnswers[campaignId] = []
  pulseAnswers[campaignId][qi] = val
}

async function sendRecognition() {
  if (!recForm.value.toUserId) {
    error.value = 'Elegí una persona'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const { data } = await api.post('/culture/recognitions', {
      toUserId: recForm.value.toUserId,
      valueId: recForm.value.valueId || undefined,
      mensaje: recForm.value.mensaje.trim(),
      visibility: recForm.value.private ? 'private' : 'public',
      points: Number(recForm.value.points) || 0,
    })
    const bits = ['Reconocimiento enviado']
    if (data.postId) bits.push('publicado en el muro')
    if (data.points?.awarded) bits.push(`+${data.points.awarded} pts`)
    okMsg.value = bits.join(' · ')
    recForm.value = { toUserId: '', toName: '', valueId: '', mensaje: '', private: false, points: 0 }
    await loadTabData()
  } catch (e) {
    handleErr(e, 'No se pudo enviar')
  } finally {
    saving.value = false
  }
}

async function contactListing(l) {
  saving.value = true
  error.value = ''
  try {
    const { data } = await api.post(`/culture/marketplace/${l.id}/contact`)
    if (data.href) router.push(data.href)
    else if (data.chatId) router.push(`/chat/${data.chatId}`)
  } catch (e) {
    handleErr(e, 'No se pudo abrir el chat')
  } finally {
    saving.value = false
  }
}

async function publishListing() {
  saving.value = true
  try {
    await api.post('/culture/marketplace', { ...mpForm.value })
    okMsg.value = 'Aviso publicado'
    mpForm.value = { titulo: '', descripcion: '', category: mpCategories.value[0] || 'venta', precio: '', contactNote: '' }
    await loadTabData()
  } catch (e) {
    handleErr(e, 'No se pudo publicar')
  } finally {
    saving.value = false
  }
}

async function createReferral() {
  saving.value = true
  try {
    await api.post('/culture/referrals', {
      vacancyId: refForm.value.vacancyId.trim() || undefined,
      candidateName: refForm.value.candidateName.trim(),
      candidateEmail: refForm.value.candidateEmail.trim(),
      candidatePhone: refForm.value.candidatePhone.trim(),
      notes: refForm.value.notes.trim(),
    })
    okMsg.value = 'Referido enviado'
    refForm.value = { vacancyId: '', candidateName: '', candidateEmail: '', candidatePhone: '', notes: '' }
    await loadTabData()
  } catch (e) {
    handleErr(e, 'No se pudo enviar')
  } finally {
    saving.value = false
  }
}

async function submitPulse(campaign) {
  saving.value = true
  try {
    const answers = campaign.questions.map((_, qi) => ({ value: pulseAnswers[campaign.id][qi] }))
    await api.post(`/culture/pulse/${campaign.id}/respond`, { answers })
    okMsg.value = 'Gracias por tu respuesta'
    await loadTabData()
  } catch (e) {
    handleErr(e, 'No se pudo enviar')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadMeta()
  if (!moduleDisabled.value) await loadTabData()
  else loading.value = false
})
</script>

<style scoped>
.cul { padding: 16px 16px 88px; max-width: 720px; margin: 0 auto; }
.cul-head h1 { margin: 0 0 4px; font-size: 1.45rem; }
.cul-head p { margin: 0; color: #64748b; font-size: 0.92rem; }
.cul-tabs { display: flex; gap: 6px; overflow-x: auto; margin: 14px 0 12px; }
.cul-tabs button { flex-shrink: 0; border: 1px solid #e2e8f0; background: #fff; border-radius: 999px; padding: 8px 14px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.cul-tabs button.on { background: var(--brand-primary, #0f766e); color: #fff; border-color: transparent; }
.cul-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.card { border: 1px solid #e2e8f0; background: #fff; border-radius: 14px; padding: 14px; }
.card.flat { display: grid; gap: 4px; }
.card-top { display: flex; gap: 8px; align-items: flex-start; }
.form { display: grid; gap: 10px; margin-bottom: 16px; }
.sub { font-size: 1rem; margin: 0 0 8px; }
.input { width: 100%; box-sizing: border-box; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; font: inherit; margin-top: 4px; }
.btn { border: none; background: var(--brand-primary, #0f766e); color: #fff; border-radius: 12px; padding: 10px 14px; font-weight: 600; cursor: pointer; justify-self: start; }
.btn.ghost { background: #fff; color: var(--brand-primary, #0f766e); border: 1px solid var(--brand-primary, #0f766e); margin-top: 8px; }
.pill { font-size: 0.72rem; font-weight: 700; border-radius: 999px; padding: 3px 8px; background: #e2e8f0; }
.tag { display: inline-block; background: #ecfdf5; color: #065f46; font-size: 0.78rem; padding: 4px 8px; border-radius: 999px; margin: 6px 0; }
.meta { margin: 4px 0 0; color: #64748b; font-size: 0.85rem; }
.row-check { flex-direction: row; align-items: center; gap: 8px; font-weight: 500; }
.pulse-form { margin-top: 12px; display: grid; gap: 12px; }
.q-block p { margin: 0 0 8px; font-weight: 600; font-size: 0.9rem; }
.enps-btns { display: flex; flex-wrap: wrap; gap: 6px; }
.enps-btns button { width: 36px; height: 36px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; font-weight: 600; cursor: pointer; }
.enps-btns button.on { background: var(--brand-primary, #0f766e); color: #fff; border-color: transparent; }
.err { color: #b91c1c; }
.ok { color: #065f46; }
.muted { color: #64748b; }
.center { text-align: center; margin-top: 24px; }
label { display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 600; }
</style>
