<template>
  <div>
    <AdminPageHeader
      title="Beneficios y billetera"
      subtitle="Catálogo con preview como en la app, tipología del legado y puntos de la comunidad."
    >
      <template #actions>
        <button type="button" class="btn-ghost" @click="seedDefaults" :disabled="busy">Catálogo base</button>
        <button type="button" class="btn-ghost" @click="openRules">
          {{ panel === 'rules' ? 'Ver catálogo' : 'Reglas de puntos' }}
        </button>
        <button type="button" class="btn-ghost" @click="panel = panel === 'wallets' ? 'list' : 'wallets'">
          {{ panel === 'wallets' ? 'Ver catálogo' : 'Puntos' }}
        </button>
        <button type="button" class="btn-ghost" @click="panel = panel === 'partners' ? 'list' : 'partners'">
          {{ panel === 'partners' ? 'Ver catálogo' : 'Partners' }}
        </button>
        <button type="button" class="btn-ghost" @click="loadReport">Canjes</button>
        <button class="btn-primary" @click="openNew">+ Beneficio</button>
      </template>
    </AdminPageHeader>
    <ScreenHelp
      purpose="ABM del catálogo: tipos de beneficio, imagen visible, partners, reglas de puntos y canjes."
      can-do="Crear beneficios paso a paso, ver previews, acreditar puntos y revisar canjes."
    />

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="okMsg" class="mt-3 text-sm text-teal-700">{{ okMsg }}</p>

    <!-- Reglas de puntos -->
    <section v-if="panel === 'rules'" class="mt-4 panel">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Reglas de puntos por uso</h2>
          <p class="text-sm text-slate-500 mt-1">
            Sumá puntos cuando la comunidad publica, reacciona, comenta, guarda o comparte.
          </p>
          <p v-if="rulesMeta.walletEnabled === false" class="text-sm text-amber-700 mt-1">
            La billetera no está activa: las reglas no acreditarán hasta habilitarla en Comunidad.
          </p>
        </div>
        <button type="button" class="btn-ghost" :disabled="busy" @click="seedRules">Cargar defaults</button>
      </div>
      <table class="w-full text-sm mt-3">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-2">Acción</th>
            <th class="p-2">Puntos</th>
            <th class="p-2">Tope/día</th>
            <th class="p-2">Activa</th>
            <th class="p-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.event" class="border-t">
            <td class="p-2">
              <div class="font-medium">{{ r.eventLabel || r.label }}</div>
            </td>
            <td class="p-2">
              <input v-model.number="r.points" class="input w-24" type="number" min="0" />
            </td>
            <td class="p-2">
              <input v-model="r.dailyCap" class="input w-24" type="number" min="0" placeholder="∞" />
            </td>
            <td class="p-2">
              <label class="inline-flex items-center gap-2">
                <input v-model="r.enabled" type="checkbox" />
                Sí
              </label>
            </td>
            <td class="p-2 text-right">
              <button type="button" class="btn-primary text-sm" :disabled="busy" @click="saveRule(r)">
                Guardar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Wallets -->
    <section v-if="panel === 'wallets'" class="mt-4 panel">
      <h2 class="text-lg font-semibold">Acreditar puntos</h2>
      <div class="grid gap-2 mt-2" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))">
        <input v-model="credit.q" class="input" placeholder="Buscar usuario…" @input="searchCreditUser" />
        <input v-model.number="credit.amount" class="input" type="number" placeholder="Monto (+/-)" />
        <input v-model="credit.concept" class="input" placeholder="Concepto" />
        <button type="button" class="btn-primary" :disabled="!credit.userId || busy" @click="doCredit">
          Acreditar
        </button>
      </div>
      <ul v-if="creditResults.length" class="user-results mt-2">
        <li v-for="u in creditResults" :key="u.id">
          <button type="button" @click="pickCreditUser(u)">
            {{ u.label }} <span class="muted">@{{ u.usuario }}</span>
          </button>
        </li>
      </ul>
      <p v-if="credit.userId" class="text-sm mt-2">Destino: <strong>{{ credit.userLabel }}</strong></p>

      <h3 class="mt-4 font-medium">Saldos</h3>
      <table class="w-full text-sm mt-2">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-2">Usuario</th>
            <th class="p-2">Nombre</th>
            <th class="p-2">Saldo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in wallets" :key="w.userId" class="border-t">
            <td class="p-2">{{ w.usuario }}</td>
            <td class="p-2">{{ w.nombre }}</td>
            <td class="p-2 font-semibold">{{ w.balance }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Partners -->
    <section v-if="panel === 'partners'" class="mt-4 panel">
      <h2 class="text-lg font-semibold">Partners / enlaces</h2>
      <p class="text-sm text-slate-500">
        Requiere capability de partners en Comunidad para verse en la app.
      </p>
      <div class="partner-form mt-3">
        <div class="partner-preview">
          <img v-if="partnerDraft.imageUrl" :src="partnerDraft.imageUrl" alt="" @error="onThumbErr" />
          <span v-else>Sin imagen</span>
        </div>
        <div class="grid gap-2 flex-1" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))">
          <input v-model="partnerDraft.titulo" class="input" placeholder="Título" />
          <input v-model="partnerDraft.url" class="input" placeholder="URL" />
          <input v-model="partnerDraft.descripcion" class="input" placeholder="Descripción" />
          <input v-model="partnerDraft.imageUrl" class="input" placeholder="URL imagen" />
          <label class="file-lbl">
            Subir imagen
            <input type="file" accept="image/*" @change="onPartnerImage" />
          </label>
          <button type="button" class="btn-primary" @click="savePartner">Agregar</button>
        </div>
      </div>
      <ul class="mt-3 space-y-2">
        <li v-for="p in partners" :key="p.id" class="partner-row">
          <div class="partner-thumb">
            <img v-if="p.imageUrl" :src="p.imageUrl" alt="" @error="onThumbErr" />
          </div>
          <div class="min-w-0 flex-1">
            <strong>{{ p.titulo }}</strong>
            <div class="text-xs text-slate-500 truncate">{{ p.url }}</div>
          </div>
          <button type="button" class="text-red-600 text-sm" @click="deletePartner(p)">Eliminar</button>
        </li>
      </ul>
    </section>

    <!-- Report -->
    <section v-if="panel === 'report'" class="mt-4 panel">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Canjes recientes</h2>
        <button type="button" class="btn-ghost" @click="panel = 'list'">Volver</button>
      </div>
      <table class="w-full text-sm mt-2">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-2">Fecha</th>
            <th class="p-2">Beneficio</th>
            <th class="p-2">Código</th>
            <th class="p-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in report" :key="r.id" class="border-t">
            <td class="p-2">{{ formatDate(r.createdAt) }}</td>
            <td class="p-2">{{ r.benefitTitulo }}</td>
            <td class="p-2 font-mono text-xs">{{ r.code }}</td>
            <td class="p-2">{{ r.pointsSpent }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!report.length" class="text-sm text-slate-500 mt-2">Sin canjes en el período.</p>
    </section>

    <!-- Catálogo con previews -->
    <template v-if="panel === 'list'">
      <div class="mt-4 flex flex-wrap gap-2 items-center">
        <input v-model="q" class="input min-w-[200px]" placeholder="Buscar…" @keyup.enter="load" />
        <select v-model="offerTypeFilter" class="input" @change="load">
          <option value="">Todos los tipos</option>
          <option v-for="t in offerTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
        <select v-model="status" class="input" @change="load">
          <option value="">Todos los estados</option>
          <option value="published">Publicados</option>
          <option value="draft">Borrador</option>
          <option value="archived">Archivados</option>
        </select>
        <button class="btn-ghost" @click="load">Buscar</button>
      </div>

      <div v-if="items.length" class="ben-grid mt-4">
        <article v-for="d in items" :key="d.id" class="ben-card">
          <div class="ben-thumb">
            <img v-if="d.imageUrl" :src="d.imageUrl" alt="" @error="onThumbErr" />
            <span v-else class="ben-thumb-empty">Sin imagen</span>
          </div>
          <div class="ben-body">
            <strong>{{ d.titulo }}</strong>
            <p class="ben-meta">
              <span class="ben-pill">{{ d.offerTypeLabel || d.kindLabel }}</span>
              <span v-if="d.costoPuntos">{{ d.costoPuntos }} pts</span>
              <span>{{ d.statusLabel || statusLabel(d.status) }}</span>
            </p>
            <p v-if="d.descripcion" class="ben-desc">{{ excerpt(d.descripcion) }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ audienceLabel(d) }} · {{ d.categoriaLabel }}</p>
            <div class="ben-actions">
              <button type="button" class="text-teal-700 text-sm font-medium" @click="openEdit(d)">
                Editar
              </button>
              <button type="button" class="text-red-600 text-sm" @click="archive(d)">Archivar</button>
            </div>
          </div>
        </article>
      </div>
      <p v-else class="mt-6 text-sm text-slate-500">No hay beneficios con esos filtros.</p>
    </template>

    <!-- Wizard -->
    <div v-if="draft" class="sheet-backdrop" @click.self="closeWizard">
      <div class="sheet sheet-wide">
        <div class="flex justify-between items-start gap-3 mb-3">
          <div>
            <h2 class="text-lg font-semibold">{{ draft.id ? 'Editar' : 'Nuevo' }} beneficio</h2>
            <p class="text-xs text-slate-500 mt-0.5">Paso {{ step }} de {{ steps.length }} · {{ steps[step - 1].title }}</p>
          </div>
          <button type="button" class="btn-ghost" @click="closeWizard">Cerrar</button>
        </div>

        <ol class="wiz-steps" aria-label="Pasos">
          <li v-for="(s, i) in steps" :key="s.id" :class="{ on: step === i + 1, done: step > i + 1 }">
            <button type="button" :disabled="i + 1 > maxReachableStep" @click="goStep(i + 1)">
              <span class="n">{{ i + 1 }}</span>
              {{ s.short }}
            </button>
          </li>
        </ol>

        <div class="wiz-layout">
          <div class="wiz-main">
            <!-- 1 Tipo -->
            <section v-if="step === 1" class="wiz-pane">
              <h3>¿Qué tipo de beneficio es?</h3>
              <p class="hint-block">Elegí el tipo como en el sistema anterior. Después solo pedimos lo necesario.</p>
              <div class="type-grid">
                <button
                  v-for="t in offerTypes"
                  :key="t.id"
                  type="button"
                  class="type-card"
                  :class="{ on: draft.offerType === t.id }"
                  @click="pickOfferType(t.id)"
                >
                  <strong>{{ t.label }}</strong>
                  <span>{{ t.hint }}</span>
                </button>
              </div>
            </section>

            <!-- 2 Contenido + imagen -->
            <section v-else-if="step === 2" class="wiz-pane">
              <h3>Contenido e imagen</h3>
              <p class="hint-block">Así se ve en la app del miembro (preview a la derecha).</p>
              <label class="lbl">Título<input v-model="draft.titulo" class="input" maxlength="160" /></label>
              <label class="lbl">Descripción<textarea v-model="draft.descripcion" class="input" rows="3" /></label>
              <label class="lbl">Condiciones<textarea v-model="draft.condiciones" class="input" rows="2" /></label>
              <label class="lbl">
                Categoría
                <select v-model="draft.categoria" class="input">
                  <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option>
                </select>
              </label>
              <label class="lbl">
                Imagen (URL)
                <input v-model="draft.imageUrl" class="input" placeholder="https://… o subí un archivo" />
              </label>
              <label class="file-lbl mt-1">
                Subir imagen
                <input type="file" accept="image/*" @change="onImageFile" />
              </label>
            </section>

            <!-- 3 Reglas según tipo -->
            <section v-else-if="step === 3" class="wiz-pane">
              <h3>Reglas del tipo «{{ currentOfferLabel }}»</h3>

              <template v-if="needsPoints">
                <div class="grid gap-2" style="grid-template-columns: 1fr 1fr 1fr">
                  <label class="lbl">
                    Costo en puntos
                    <input v-model.number="draft.costoPuntos" type="number" min="0" class="input" />
                  </label>
                  <label class="lbl">Stock<input v-model="draft.stock" class="input" placeholder="Sin límite" /></label>
                  <label class="lbl">
                    Límite por persona
                    <input v-model="draft.limitePorUsuario" class="input" placeholder="Sin límite" />
                  </label>
                </div>
                <p class="hint-block">Al canjear, la app genera un código/QR local para presentar.</p>
              </template>

              <template v-else-if="draft.offerType === 'informativo'">
                <p class="hint-block">
                  Convenio informativo: no gasta puntos. El miembro lee detalle y condiciones.
                </p>
                <label class="lbl">
                  Partner (opcional)
                  <input v-model="draft.partnerName" class="input" placeholder="Nombre del comercio" />
                </label>
              </template>

              <template v-if="draft.offerType === 'geo'">
                <label class="lbl">Sucursal / lugar<input v-model="draft.sucursal" class="input" /></label>
                <div class="grid gap-2" style="grid-template-columns: 1fr 1fr">
                  <label class="lbl">Latitud<input v-model="draft.lat" class="input" placeholder="-34.60" /></label>
                  <label class="lbl">Longitud<input v-model="draft.lng" class="input" placeholder="-58.38" /></label>
                </div>
                <p class="hint-block">Con coordenadas aparece en el mapa de beneficios de la app.</p>
              </template>

              <template v-if="draft.offerType === 'partner'">
                <label class="lbl">Nombre del partner<input v-model="draft.partnerName" class="input" /></label>
                <label class="lbl">
                  URL del partner
                  <input v-model="draft.partnerUrl" class="input" placeholder="https://…" />
                </label>
              </template>

              <label v-if="!needsPoints && draft.offerType !== 'informativo'" class="lbl mt-2">
                Partner (opcional)
                <input v-model="draft.partnerName" class="input" />
              </label>
            </section>

            <!-- 4 Audiencia -->
            <section v-else-if="step === 4" class="wiz-pane">
              <h3>¿Quién lo ve?</h3>
              <fieldset class="audience">
                <div class="audience-modes">
                  <button type="button" :class="{ on: draft.audience.mode === 'all' }" @click="setAudMode('all')">
                    Toda la comunidad
                  </button>
                  <button
                    type="button"
                    :class="{ on: draft.audience.mode === 'restricted' }"
                    @click="setAudMode('restricted')"
                  >
                    Áreas / grupos
                  </button>
                  <button type="button" :class="{ on: draft.audience.mode === 'users' }" @click="setAudMode('users')">
                    Personas
                  </button>
                </div>
                <div v-if="draft.audience.mode === 'restricted'" class="aud-lists">
                  <div>
                    <p class="hint">Áreas</p>
                    <label v-for="a in org.areas" :key="a.id" class="check">
                      <input type="checkbox" :value="a.id" v-model="draft.audience.areaIds" />
                      {{ a.nombre }}
                    </label>
                  </div>
                  <div>
                    <p class="hint">Grupos</p>
                    <label v-for="g in org.groups" :key="g.id" class="check">
                      <input type="checkbox" :value="g.id" v-model="draft.audience.groupIds" />
                      {{ g.nombre }}
                    </label>
                  </div>
                </div>
                <div v-if="draft.audience.mode === 'restricted' || draft.audience.mode === 'users'" class="mt-2">
                  <input
                    v-model="audienceUserQuery"
                    class="input"
                    placeholder="Buscar personas…"
                    @input="searchAudienceUsers"
                  />
                  <ul class="user-results">
                    <li v-for="u in audienceUserResults" :key="u.id">
                      <button
                        type="button"
                        :disabled="draft.audience.userIds.includes(u.id)"
                        @click="addAudienceUser(u)"
                      >
                        + {{ u.label }}
                      </button>
                    </li>
                  </ul>
                  <div class="chips">
                    <span v-for="u in selectedAudienceUsers" :key="u.id" class="chip">
                      {{ u.label }}
                      <button type="button" @click="removeAudienceUser(u.id)">×</button>
                    </span>
                  </div>
                </div>
              </fieldset>
            </section>

            <!-- 5 Publicar -->
            <section v-else class="wiz-pane">
              <h3>Publicar</h3>
              <label class="lbl">
                Estado
                <select v-model="draft.status" class="input">
                  <option value="draft">Borrador (solo admin)</option>
                  <option value="published">Publicado (visible en la app)</option>
                  <option value="archived">Archivado</option>
                </select>
              </label>
              <label class="check mt-3">
                <input v-model="draft.destacado" type="checkbox" />
                Destacar en el catálogo
              </label>
              <ul class="summary mt-3">
                <li><strong>Tipo:</strong> {{ currentOfferLabel }}</li>
                <li><strong>Título:</strong> {{ draft.titulo || '—' }}</li>
                <li><strong>Puntos:</strong> {{ needsPoints ? draft.costoPuntos || 0 : 'No aplica' }}</li>
                <li><strong>Audiencia:</strong> {{ audienceLabel({ audience: draft.audience }) }}</li>
              </ul>
            </section>

            <div class="wiz-nav">
              <button type="button" class="btn-ghost" :disabled="step === 1" @click="step -= 1">Atrás</button>
              <div class="flex gap-2">
                <button v-if="step < steps.length" type="button" class="btn-primary" :disabled="!canAdvance" @click="nextStep">
                  Siguiente
                </button>
                <button v-else type="button" class="btn-primary" :disabled="busy || !canSave" @click="save">
                  {{ busy ? 'Guardando…' : 'Guardar' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Preview estilo app U -->
          <aside class="wiz-preview">
            <p class="preview-label">Vista en la app</p>
            <div class="u-card">
              <div class="u-thumb">
                <img v-if="draft.imageUrl" :src="draft.imageUrl" alt="" @error="onThumbErr" />
                <span v-else>Sin imagen</span>
              </div>
              <div class="u-main">
                <strong>{{ draft.titulo || 'Título del beneficio' }}</strong>
                <p class="ben-meta">
                  <span class="ben-pill">{{ currentOfferLabel }}</span>
                  <span v-if="Number(draft.costoPuntos) > 0">{{ draft.costoPuntos }} pts</span>
                </p>
                <p class="ben-desc">{{ excerpt(draft.descripcion || 'La descripción aparece acá…') }}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import ScreenHelp from '../components/ScreenHelp.vue'

const DEFAULT_OFFER_TYPES = [
  {
    id: 'informativo',
    label: 'Informativo / convenio',
    hint: 'Descuento o perk sin gastar puntos. Solo lectura y condiciones.',
  },
  {
    id: 'canjeable',
    label: 'Canjeable con puntos',
    hint: 'Se canjea con puntos: código/QR, stock y cupos.',
  },
  {
    id: 'premio',
    label: 'Premio / recompensa',
    hint: 'Catálogo de premios canjeables (gift card, día libre…).',
  },
  {
    id: 'geo',
    label: 'Con ubicación',
    hint: 'Sucursal o punto en el mapa de la app.',
  },
  {
    id: 'partner',
    label: 'Link / partner',
    hint: 'Abre URL de un partner; ideal con imagen y nombre.',
  },
]

const steps = [
  { id: 'tipo', short: 'Tipo', title: 'Elegir tipo' },
  { id: 'contenido', short: 'Contenido', title: 'Contenido e imagen' },
  { id: 'reglas', short: 'Reglas', title: 'Reglas del tipo' },
  { id: 'audiencia', short: 'Audiencia', title: 'Quién lo ve' },
  { id: 'publicar', short: 'Publicar', title: 'Revisar y publicar' },
]

const items = ref([])
const categories = ref([])
const offerTypes = ref([...DEFAULT_OFFER_TYPES])
const org = ref({ areas: [], groups: [] })
const q = ref('')
const offerTypeFilter = ref('')
const status = ref('')
const error = ref('')
const okMsg = ref('')
const busy = ref(false)
const draft = ref(null)
const step = ref(1)
const panel = ref('list')
const wallets = ref([])
const partners = ref([])
const report = ref([])
const partnerDraft = ref({ titulo: '', url: '', descripcion: '', imageUrl: '' })
const credit = ref({ q: '', userId: '', userLabel: '', amount: 500, concept: 'Acreditación admin' })
const creditResults = ref([])
const rules = ref([])
const rulesMeta = ref({ walletEnabled: true })
const audienceUserQuery = ref('')
const audienceUserResults = ref([])
const audienceUserCache = ref({})
let audienceTimer = null
let creditTimer = null

function emptyAudience() {
  return { mode: 'all', areaIds: [], groupIds: [], userIds: [] }
}

function audienceLabel(d) {
  const a = d?.audience
  if (!a || a.mode === 'all') return 'Todos'
  if (a.mode === 'users') return `${(a.userIds || []).length} personas`
  if (a.mode === 'none') return 'Nadie'
  const n = (a.areaIds?.length || 0) + (a.groupIds?.length || 0) + (a.userIds?.length || 0)
  return `Segmentado (${n})`
}

function statusLabel(s) {
  if (s === 'published') return 'Publicado'
  if (s === 'archived') return 'Archivado'
  return 'Borrador'
}

function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return ''
  }
}

function excerpt(t, n = 90) {
  const s = String(t || '').trim()
  if (s.length <= n) return s
  return `${s.slice(0, n)}…`
}

function onThumbErr(e) {
  e.target.style.display = 'none'
}

const selectedAudienceUsers = computed(() => {
  const ids = draft.value?.audience?.userIds || []
  return ids.map((id) => audienceUserCache.value[id] || { id, label: id })
})

const currentOfferLabel = computed(() => {
  const id = draft.value?.offerType
  return offerTypes.value.find((t) => t.id === id)?.label || 'Beneficio'
})

const needsPoints = computed(() => {
  const t = draft.value?.offerType
  return t === 'canjeable' || t === 'premio'
})

const canAdvance = computed(() => {
  if (!draft.value) return false
  if (step.value === 1) return Boolean(draft.value.offerType)
  if (step.value === 2) return Boolean(draft.value.titulo?.trim())
  if (step.value === 3 && draft.value.offerType === 'partner') {
    return Boolean(String(draft.value.partnerUrl || '').trim())
  }
  if (step.value === 3 && draft.value.offerType === 'geo') {
    const hasSuc = Boolean(String(draft.value.sucursal || '').trim())
    const hasCoords =
      draft.value.lat !== '' &&
      draft.value.lng !== '' &&
      Number.isFinite(Number(draft.value.lat)) &&
      Number.isFinite(Number(draft.value.lng))
    return hasSuc || hasCoords
  }
  if (step.value === 3 && needsPoints.value) {
    return Number(draft.value.costoPuntos) > 0
  }
  return true
})

const canSave = computed(() => Boolean(draft.value?.titulo?.trim() && draft.value?.offerType))

const maxReachableStep = computed(() => {
  if (!draft.value?.offerType) return 1
  if (!draft.value?.titulo?.trim()) return 2
  return steps.length
})

async function load() {
  error.value = ''
  try {
    const params = {}
    if (q.value.trim()) params.q = q.value.trim()
    if (offerTypeFilter.value) params.offerType = offerTypeFilter.value
    if (status.value) params.status = status.value
    const { data } = await api.get('/admin/benefits', { params })
    items.value = data.items || []
    categories.value = data.categories || []
    if (data.offerTypes?.length) offerTypes.value = data.offerTypes
    org.value = data.org || { areas: [], groups: [] }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar'
  }
}

function blankDraft(offerType = 'informativo') {
  return {
    titulo: '',
    descripcion: '',
    condiciones: '',
    offerType,
    kind: offerType === 'premio' ? 'reward' : 'benefit',
    categoria: offerType === 'premio' ? 'premios' : 'otros',
    costoPuntos: offerType === 'premio' ? 500 : offerType === 'canjeable' ? 100 : 0,
    stock: '',
    limitePorUsuario: '',
    status: 'published',
    imageUrl: '',
    partnerName: '',
    partnerUrl: '',
    lat: '',
    lng: '',
    sucursal: '',
    destacado: false,
    audience: emptyAudience(),
  }
}

function openNew() {
  draft.value = blankDraft('informativo')
  step.value = 1
}

function openEdit(d) {
  const aud = d.audience || emptyAudience()
  draft.value = {
    id: d.id,
    titulo: d.titulo,
    descripcion: d.descripcion,
    condiciones: d.condiciones,
    offerType: d.offerType || 'informativo',
    kind: d.kind,
    categoria: d.categoria,
    costoPuntos: d.costoPuntos,
    stock: d.stock == null ? '' : d.stock,
    limitePorUsuario: d.limitePorUsuario == null ? '' : d.limitePorUsuario,
    status: d.status,
    imageUrl: d.imageUrl,
    partnerName: d.partnerName,
    partnerUrl: d.partnerUrl,
    lat: d.lat ?? '',
    lng: d.lng ?? '',
    sucursal: d.sucursal || '',
    destacado: Boolean(d.destacado),
    audience: {
      mode: aud.mode || 'all',
      areaIds: (aud.areaIds || []).map(String),
      groupIds: (aud.groupIds || []).map(String),
      userIds: (aud.userIds || []).map(String),
    },
  }
  step.value = 2
  if (draft.value.audience.userIds.length) hydrateAudienceUsers(draft.value.audience.userIds)
}

function closeWizard() {
  draft.value = null
  step.value = 1
}

function pickOfferType(id) {
  const prev = draft.value
  const next = blankDraft(id)
  if (prev) {
    next.id = prev.id
    next.titulo = prev.titulo
    next.descripcion = prev.descripcion
    next.condiciones = prev.condiciones
    next.imageUrl = prev.imageUrl
    next.audience = prev.audience
    next.status = prev.status
    next.destacado = prev.destacado
    if (id === 'premio' || id === 'canjeable') {
      next.costoPuntos = Number(prev.costoPuntos) > 0 ? prev.costoPuntos : next.costoPuntos
      next.stock = prev.stock
      next.limitePorUsuario = prev.limitePorUsuario
    }
    if (id === 'geo') {
      next.lat = prev.lat
      next.lng = prev.lng
      next.sucursal = prev.sucursal
    }
    if (id === 'partner' || id === 'informativo') {
      next.partnerName = prev.partnerName
      next.partnerUrl = prev.partnerUrl
    }
    if (prev.categoria) next.categoria = prev.categoria
  }
  draft.value = next
}

function nextStep() {
  if (!canAdvance.value) return
  if (step.value < steps.length) step.value += 1
}

function goStep(n) {
  if (n >= 1 && n <= maxReachableStep.value) step.value = n
}

function setAudMode(mode) {
  draft.value.audience = {
    mode,
    areaIds: mode === 'restricted' ? draft.value.audience.areaIds : [],
    groupIds: mode === 'restricted' ? draft.value.audience.groupIds : [],
    userIds: mode === 'users' || mode === 'restricted' ? draft.value.audience.userIds : [],
  }
}

async function hydrateAudienceUsers(ids) {
  try {
    const { data } = await api.get('/admin/benefits/audience-candidates', {
      params: { ids: ids.join(',') },
    })
    const cache = { ...audienceUserCache.value }
    for (const u of data.items || []) cache[u.id] = u
    audienceUserCache.value = cache
  } catch {
    /* ignore */
  }
}

function searchAudienceUsers() {
  clearTimeout(audienceTimer)
  audienceTimer = setTimeout(async () => {
    const qv = audienceUserQuery.value.trim()
    if (qv.length < 2) {
      audienceUserResults.value = []
      return
    }
    const { data } = await api.get('/admin/benefits/audience-candidates', { params: { q: qv } })
    audienceUserResults.value = data.items || []
  }, 250)
}

function addAudienceUser(u) {
  audienceUserCache.value = { ...audienceUserCache.value, [u.id]: u }
  if (!draft.value.audience.userIds.includes(u.id)) draft.value.audience.userIds.push(u.id)
}

function removeAudienceUser(id) {
  draft.value.audience.userIds = draft.value.audience.userIds.filter((x) => x !== id)
}

async function uploadImage(file) {
  const fd = new FormData()
  fd.append('files', file)
  const { data } = await api.post('/admin/benefits/upload', fd)
  return data.url || data.urls?.[0] || ''
}

async function onImageFile(e) {
  const file = e.target.files?.[0]
  if (!file || !draft.value) return
  try {
    draft.value.imageUrl = await uploadImage(file)
    okMsg.value = 'Imagen subida'
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo subir la imagen'
  }
}

async function onPartnerImage(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    partnerDraft.value.imageUrl = await uploadImage(file)
    okMsg.value = 'Imagen de partner subida'
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo subir la imagen'
  }
}

async function save() {
  if (!canSave.value) {
    error.value = 'Completá tipo y título'
    return
  }
  if (draft.value.offerType === 'partner' && !String(draft.value.partnerUrl || '').trim()) {
    error.value = 'URL del partner obligatoria'
    step.value = 3
    return
  }
  busy.value = true
  error.value = ''
  try {
    const body = {
      ...draft.value,
      offerType: draft.value.offerType,
      stock: draft.value.stock === '' ? null : Number(draft.value.stock),
      limitePorUsuario:
        draft.value.limitePorUsuario === '' ? null : Number(draft.value.limitePorUsuario),
      lat: draft.value.lat === '' ? null : Number(draft.value.lat),
      lng: draft.value.lng === '' ? null : Number(draft.value.lng),
      costoPuntos: needsPoints.value ? Number(draft.value.costoPuntos) || 0 : Number(draft.value.costoPuntos) || 0,
    }
    if (draft.value.offerType === 'informativo') body.costoPuntos = 0
    if (draft.value.id) {
      await api.patch(`/admin/benefits/${draft.value.id}`, body)
      okMsg.value = 'Beneficio actualizado'
    } else {
      await api.post('/admin/benefits', body)
      okMsg.value = 'Beneficio creado'
    }
    closeWizard()
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar'
  } finally {
    busy.value = false
  }
}

async function archive(d) {
  if (!confirm(`Archivar «${d.titulo}»?`)) return
  try {
    await api.delete(`/admin/benefits/${d.id}`)
    okMsg.value = 'Archivado'
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo archivar'
  }
}

async function seedDefaults() {
  busy.value = true
  try {
    const { data } = await api.post('/admin/benefits/seed-defaults')
    okMsg.value = `Catálogo base: ${data.created} nuevos, ${data.skipped} ya existían`
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al seed'
  } finally {
    busy.value = false
  }
}

async function loadWallets() {
  const { data } = await api.get('/admin/benefits/wallets')
  wallets.value = data.items || []
}

async function loadPartners() {
  const { data } = await api.get('/admin/benefits/partners')
  partners.value = data.items || []
}

async function loadReport() {
  panel.value = 'report'
  const { data } = await api.get('/admin/benefits/report')
  report.value = data.items || []
}

function searchCreditUser() {
  clearTimeout(creditTimer)
  creditTimer = setTimeout(async () => {
    const qv = credit.value.q.trim()
    if (qv.length < 2) {
      creditResults.value = []
      return
    }
    const { data } = await api.get('/admin/benefits/audience-candidates', { params: { q: qv } })
    creditResults.value = data.items || []
  }, 250)
}

function pickCreditUser(u) {
  credit.value.userId = u.id
  credit.value.userLabel = u.label
  credit.value.q = u.usuario
  creditResults.value = []
}

async function openRules() {
  if (panel.value === 'rules') {
    panel.value = 'list'
    return
  }
  panel.value = 'rules'
  await loadRules()
}

async function loadRules() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/points-rules')
    rules.value = (data.items || []).map((r) => ({
      ...r,
      dailyCap: r.dailyCap == null ? '' : r.dailyCap,
    }))
    rulesMeta.value = { walletEnabled: data.walletEnabled !== false }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar las reglas'
  }
}

async function saveRule(r) {
  busy.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const dailyCap =
      r.dailyCap === '' || r.dailyCap == null || Number.isNaN(Number(r.dailyCap))
        ? null
        : Number(r.dailyCap)
    const { data } = await api.put(`/admin/points-rules/${r.event}`, {
      points: Number(r.points) || 0,
      dailyCap,
      enabled: Boolean(r.enabled),
      label: r.label || r.eventLabel,
    })
    okMsg.value = `Regla «${data.rule?.eventLabel || r.event}» guardada`
    await loadRules()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar la regla'
  } finally {
    busy.value = false
  }
}

async function seedRules() {
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/points-rules/seed')
    okMsg.value = `Defaults: ${data.created} nuevas, ${data.skipped} ya existían`
    await loadRules()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron crear defaults'
  } finally {
    busy.value = false
  }
}

async function doCredit() {
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.post('/admin/benefits/credit', {
      userId: credit.value.userId,
      amount: Number(credit.value.amount),
      concept: credit.value.concept,
      idempotencyKey: `admin-credit:${credit.value.userId}:${Date.now()}`,
    })
    okMsg.value = `Saldo actualizado: ${data.balance} pts`
    await loadWallets()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo acreditar'
  } finally {
    busy.value = false
  }
}

async function savePartner() {
  try {
    await api.post('/admin/benefits/partners', partnerDraft.value)
    partnerDraft.value = { titulo: '', url: '', descripcion: '', imageUrl: '' }
    okMsg.value = 'Partner agregado'
    await loadPartners()
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo guardar partner'
  }
}

async function deletePartner(p) {
  if (!confirm(`Eliminar «${p.titulo}»?`)) return
  await api.delete(`/admin/benefits/partners/${p.id}`)
  await loadPartners()
}

onMounted(async () => {
  await load()
})

watch(panel, async (p) => {
  if (p === 'wallets') await loadWallets()
  if (p === 'partners') await loadPartners()
})
</script>

<style scoped>
.btn-primary {
  border-radius: 0.5rem;
  background: var(--brand-primary);
  color: #fff;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}
.btn-ghost {
  border-radius: 0.5rem;
  border: 1px solid var(--line-2);
  background: var(--panel);
  padding: 0.5rem 0.85rem;
  font-size: 0.875rem;
}
.input {
  border: 1px solid var(--line-2);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  width: 100%;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 1rem;
}
.lbl {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin-top: 0.5rem;
}
.file-lbl {
  display: inline-flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.file-lbl input[type='file'] {
  font-size: 0.8rem;
}
.ben-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.85rem;
}
.ben-card {
  display: flex;
  gap: 0.75rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 0.85rem;
  padding: 0.65rem;
  align-items: stretch;
}
.ben-thumb,
.u-thumb,
.partner-thumb,
.partner-preview {
  width: 88px;
  min-width: 88px;
  height: 88px;
  border-radius: 0.65rem;
  overflow: hidden;
  background: var(--panel-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-faint);
  font-size: 0.7rem;
}
.ben-thumb img,
.u-thumb img,
.partner-thumb img,
.partner-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ben-thumb-empty {
  padding: 0.35rem;
  text-align: center;
}
.ben-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ben-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--ink-soft);
  margin: 0.2rem 0;
}
.ben-pill {
  background: var(--ok-bg);
  color: var(--brand-primary);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  font-weight: 500;
}
.ben-desc {
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin: 0;
  line-height: 1.35;
}
.ben-actions {
  margin-top: auto;
  padding-top: 0.4rem;
  display: flex;
  gap: 0.75rem;
}
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 40;
  display: flex;
  justify-content: flex-end;
}
.sheet {
  width: min(480px, 100%);
  height: 100%;
  background: var(--panel);
  overflow: auto;
  padding: 1.25rem;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
}
.sheet-wide {
  width: min(920px, 100%);
}
.wiz-steps {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0 0 1rem;
  padding: 0;
}
.wiz-steps button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--line);
  background: var(--panel-2);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.72rem;
  color: var(--ink-soft);
}
.wiz-steps li.on button {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.wiz-steps li.done button {
  border-color: color-mix(in srgb, var(--brand-primary) 28%, var(--panel));
  color: var(--brand-primary);
}
.wiz-steps .n {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.wiz-layout {
  display: grid;
  grid-template-columns: 1fr minmax(220px, 260px);
  gap: 1rem;
  align-items: start;
}
@media (max-width: 720px) {
  .wiz-layout {
    grid-template-columns: 1fr;
  }
}
.wiz-pane h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
}
.hint-block {
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin: 0 0 0.75rem;
}
.type-grid {
  display: grid;
  gap: 0.5rem;
}
.type-card {
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: var(--panel);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.type-card strong {
  font-size: 0.9rem;
}
.type-card span {
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.type-card.on {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--panel));
  box-shadow: 0 0 0 1px var(--brand-primary);
}
.wiz-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--line);
}
.wiz-preview {
  position: sticky;
  top: 0;
  background: var(--panel-2);
  border: 1px dashed var(--line-2);
  border-radius: 0.85rem;
  padding: 0.75rem;
}
.preview-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
  margin: 0 0 0.5rem;
}
.u-card {
  display: flex;
  gap: 0.65rem;
  background: var(--panel);
  border-radius: 0.75rem;
  padding: 0.5rem;
  border: 1px solid var(--line);
}
.u-thumb {
  width: 72px;
  min-width: 72px;
  height: 72px;
}
.u-main {
  min-width: 0;
}
.u-main strong {
  font-size: 0.85rem;
}
.summary {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  background: var(--panel-2);
  border-radius: 0.65rem;
  font-size: 0.85rem;
}
.summary li {
  margin: 0.25rem 0;
}
.audience {
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  padding: 0.75rem;
}
.audience-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}
.audience-modes button {
  border: 1px solid var(--line-2);
  background: var(--panel);
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
}
.audience-modes button.on {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}
.aud-lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.check {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
.hint {
  font-size: 0.75rem;
  color: var(--ink-soft);
  margin: 0;
}
.user-results {
  list-style: none;
  margin: 0.35rem 0;
  padding: 0;
}
.user-results button {
  border: none;
  background: var(--panel-2);
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  font-size: 0.8rem;
  margin-top: 0.2rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.35rem;
}
.chip {
  background: var(--ok-bg);
  color: var(--brand-primary);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
}
.chip button {
  border: none;
  background: transparent;
  color: var(--brand-primary);
}
.muted {
  color: var(--ink-faint);
}
.partner-form {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  flex-wrap: wrap;
}
.partner-row {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  padding: 0.5rem;
}
.partner-thumb {
  width: 56px;
  min-width: 56px;
  height: 56px;
}
.partner-preview {
  width: 72px;
  min-width: 72px;
  height: 72px;
}
</style>
