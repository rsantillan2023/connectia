<template>
  <div>
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Suscriptores</h1>
        <p class="text-sm text-slate-500 mt-1">Clientes / comunidades de la plataforma.</p>
        <ScreenHelp
          purpose="Vista del operador de plataforma: listado de tenants (comunidades) que usan Connectia."
          can-do="Alta con IA y seed, ver marca/logo/accesos, editar y activar o desactivar."
        />
      </div>
      <button class="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium" @click="openNew">
        + Nuevo suscriptor
      </button>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="msg" class="mt-3 text-sm text-teal-700">{{ msg }}</p>

    <div class="mt-4 overflow-x-auto bg-white border rounded-xl">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="p-3">Código</th>
            <th class="p-3">Nombre</th>
            <th class="p-3">Usuarios</th>
            <th class="p-3">App web</th>
            <th class="p-3">Estado</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in items" :key="t.id" class="border-t" :class="t.isPlatform ? 'bg-slate-50' : ''">
            <td class="p-3 font-mono text-xs">
              <span class="inline-flex items-center gap-2">
                <img
                  v-if="logoOf(t)"
                  :src="logoOf(t)"
                  alt=""
                  class="h-6 w-6 object-contain rounded border bg-white"
                />
                {{ t.empCodigo }}
              </span>
              <span v-if="t.isPlatform" class="ml-1 text-[10px] uppercase text-amber-600">sistema</span>
            </td>
            <td class="p-3">{{ t.nombre }}</td>
            <td class="p-3">{{ t.usersCount ?? '—' }}</td>
            <td class="p-3">{{ t.allowDesktop ? 'Sí' : 'No' }}</td>
            <td class="p-3">
              <span :class="t.activo ? 'text-teal-700' : 'text-red-600'">{{ t.activo ? 'Activo' : 'Inactivo' }}</span>
            </td>
            <td class="p-3 text-right whitespace-nowrap">
              <button v-if="!t.isPlatform" class="text-teal-700 mr-2" @click="edit(t)">Ver / editar</button>
              <button
                v-if="!t.isPlatform"
                class="text-slate-600"
                @click="toggleActivo(t)"
              >
                {{ t.activo ? 'Desactivar' : 'Activar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="draft"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      @click.self="!saving && (draft = null)"
    >
      <form
        class="bg-white rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        @submit.prevent="save"
      >
        <div>
          <h2 class="font-semibold text-lg">{{ draft.id ? 'Suscriptor' : 'Nuevo suscriptor' }}</h2>
          <p v-if="!draft.id" class="text-sm text-slate-500 mt-1">
            Con el nombre y la web, buscamos logo, colores e info y dejamos la comunidad lista. Al final te damos el mensaje para enviarle al cliente.
          </p>
        </div>

        <TenantOnboardingPanel
          v-if="draft.id && onboardingOf(draft)"
          :tenant="draft"
          :onboarding="onboardingOf(draft)"
          @copied="onCopied"
        />

        <label class="block space-y-1">
          <span class="text-sm font-medium text-slate-700">Código</span>
          <input
            v-model="draft.empCodigo"
            :disabled="Boolean(draft.id) || saving"
            class="w-full border rounded-lg px-3 py-2"
            placeholder="Ej. ACME"
            required
          />
        </label>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-slate-700">Nombre de la empresa</span>
          <input
            v-model="draft.nombre"
            :disabled="saving"
            class="w-full border rounded-lg px-3 py-2"
            placeholder="Ej. Acme Argentina"
            required
          />
        </label>

        <template v-if="!draft.id">
          <label class="block space-y-1">
            <span class="text-sm font-medium text-slate-700">Sitio web</span>
            <input
              v-model="draft.websiteUrl"
              :disabled="saving"
              class="w-full border rounded-lg px-3 py-2"
              placeholder="www.empresa.com"
            />
            <span class="text-xs text-slate-500">De acá sacamos logo, colores y descripción. Si lo dejás vacío, intentamos encontrarlo.</span>
          </label>

          <details class="rounded-lg border bg-slate-50 px-3 py-2">
            <summary class="cursor-pointer text-sm text-slate-600 select-none">Nota opcional para la IA</summary>
            <textarea
              v-model="draft.notes"
              :disabled="saving"
              rows="2"
              class="mt-2 w-full border rounded-lg px-3 py-2 text-sm bg-white"
              placeholder="Algo que no esté en la web (plantas, tono, etc.)"
            />
          </details>
        </template>

        <label v-if="draft.id" class="flex items-start gap-2 text-sm">
          <input v-model="draft.activo" type="checkbox" class="mt-0.5" />
          <span>
            <span class="font-medium text-slate-700">Suscriptor activo</span>
            <span class="block text-xs text-slate-500">Si lo desactivás, sus usuarios no pueden entrar.</span>
          </span>
        </label>

        <fieldset class="space-y-3 rounded-xl border border-slate-200 p-4">
          <legend class="px-1 text-sm font-semibold text-slate-800">Módulos contratados</legend>
          <p class="text-xs text-slate-500 -mt-1">
            Lo que compra el cliente. El admin de la comunidad solo puede activar módulos dentro de esta lista.
          </p>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="p in PACK_OPTIONS"
              :key="p.id"
              class="flex-1 min-w-[9rem] cursor-pointer rounded-lg border px-3 py-2 text-sm"
              :class="
                draft.pack === p.id
                  ? 'border-teal-600 bg-teal-50 text-teal-900'
                  : 'border-slate-200 bg-white text-slate-700'
              "
            >
              <input v-model="draft.pack" type="radio" class="sr-only" :value="p.id" :disabled="saving" @change="onPackChange" />
              <span class="font-medium">{{ p.label }}</span>
              <span class="mt-0.5 block text-[11px] leading-snug text-slate-500">{{ p.hint }}</span>
            </label>
          </div>
          <div v-if="draft.pack === 'personalizado'" class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="mod in MODULE_CATALOG"
              :key="mod.id"
              class="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-sm"
            >
              <input
                v-model="draft.moduleIds"
                type="checkbox"
                class="mt-0.5"
                :value="mod.id"
                :disabled="saving"
              />
              <span>
                <span class="font-medium text-slate-800">{{ mod.label }}</span>
                <span class="block text-[11px] text-slate-500">{{ mod.hint }}</span>
              </span>
            </label>
          </div>
          <p v-else class="text-xs text-slate-600">
            Incluye:
            <span class="font-medium">{{ packPreviewLabels }}</span>
          </p>
        </fieldset>

        <p v-if="saving" class="text-sm text-teal-700">
          Leyendo la web, armando marca y preparando la comunidad… puede tardar unos segundos.
        </p>
        <p v-if="copyFlash" class="text-sm text-teal-700">{{ copyFlash }}</p>

        <div class="flex gap-2 justify-end pt-1">
          <button type="button" class="px-4 py-2 border rounded-lg" :disabled="saving" @click="draft = null">
            {{ draft.id ? 'Cerrar' : 'Cancelar' }}
          </button>
          <button class="px-4 py-2 bg-teal-700 text-white rounded-lg disabled:opacity-60" :disabled="saving">
            {{ saving ? 'Creando…' : draft.id ? 'Guardar cambios' : 'Crear y preparar' }}
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="seedInfo"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      @click.self="seedInfo = null"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div>
          <h2 class="font-semibold text-lg">Listo para informar al cliente</h2>
          <p class="text-sm text-slate-600 mt-1">
            Comunidad usable creada. Copiá el mensaje y enviáselo a quien pidió la membresía.
          </p>
        </div>

        <TenantOnboardingPanel
          :tenant="seedInfo.tenant"
          :onboarding="seedInfo.onboarding"
          compact
          @copied="onCopied"
        />

        <p v-if="copyFlash" class="text-sm text-teal-700">{{ copyFlash }}</p>

        <div class="flex flex-wrap gap-2 justify-end pt-1">
          <button type="button" class="px-4 py-2 border rounded-lg" @click="openEditFromSeed">
            Ver detalle
          </button>
          <button type="button" class="px-4 py-2 bg-teal-700 text-white rounded-lg" @click="seedInfo = null">
            Listo
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import ScreenHelp from '../components/ScreenHelp.vue'
import TenantOnboardingPanel from '../components/TenantOnboardingPanel.vue'
import { resolveMediaUrl } from '../utils/media.js'
import {
  MODULE_CATALOG,
  MODULE_PACKS,
  PACK_OPTIONS,
  detectPack,
  resolvePackSelection,
} from '../utils/moduleCatalog.js'

const items = ref([])
const draft = ref(null)
const error = ref('')
const msg = ref('')
const saving = ref(false)
const seedInfo = ref(null)
const copyFlash = ref('')

const packPreviewLabels = computed(() => {
  if (!draft.value) return ''
  const ids = resolvePackSelection(draft.value.pack, draft.value.moduleIds)
  const byId = new Map(MODULE_CATALOG.map((m) => [m.id, m.label]))
  return ids.map((id) => byId.get(id) || id).join(' · ')
})

function logoOf(t) {
  const raw = t?.onboarding?.logoUrl || t?.branding?.logoUrl || t?.branding?.splash?.logoUrl || ''
  return resolveMediaUrl(raw)
}

function onboardingOf(t) {
  if (t?.onboarding) return t.onboarding
  if (!t?.branding && !t?.empCodigo) return null
  return {
    logoUrl: t.branding?.logoUrl || '',
    primary: t.branding?.primary,
    secondary: t.branding?.secondary,
    splashSubtitle: t.branding?.splashSubtitle || t.branding?.splash?.subtitle || '',
    credentials: {
      empCodigo: t.empCodigo,
      adminUsuario: `admin.${String(t.empCodigo || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')}`,
      password: 'Demo1234!',
      sampleUsers: ['comunicacion', 'rrhh.gestor', 'juan.perez'],
      appUrl: 'http://localhost:5173',
      adminUrl: 'http://localhost:5174',
    },
  }
}

function onCopied(label) {
  copyFlash.value = label || 'Copiado al portapapeles'
  setTimeout(() => {
    if (copyFlash.value === label) copyFlash.value = ''
  }, 2000)
}

function onPackChange() {
  if (!draft.value) return
  if (draft.value.pack !== 'personalizado') {
    draft.value.moduleIds = resolvePackSelection(draft.value.pack, [])
  } else if (!draft.value.moduleIds?.length) {
    draft.value.moduleIds = [...MODULE_PACKS.todo]
  }
}

async function load() {
  error.value = ''
  try {
    const { data } = await api.get('/admin/tenants')
    items.value = data.items || []
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar suscriptores (¿sos admin plataforma?)'
  }
}

function openNew() {
  draft.value = {
    empCodigo: '',
    nombre: '',
    allowDesktop: true,
    activo: true,
    websiteUrl: '',
    notes: '',
    pack: 'todo',
    moduleIds: [...MODULE_PACKS.todo],
  }
  msg.value = ''
}

function edit(t) {
  const licensed = t.licensedCapabilities?.length ? t.licensedCapabilities : t.capabilities || []
  draft.value = {
    ...t,
    pack: detectPack(licensed),
    moduleIds: licensed.length ? [...licensed] : [...MODULE_PACKS.todo],
  }
  msg.value = ''
  copyFlash.value = ''
}

function openEditFromSeed() {
  const t = seedInfo.value?.tenant
  seedInfo.value = null
  if (t) edit(t)
}

async function save() {
  try {
    const licensed = resolvePackSelection(draft.value.pack, draft.value.moduleIds)
    if (draft.value.id) {
      // Solo pack/licencia: el backend preserva caps operativas fuera del MODULE_CATALOG
      // (directorio, talento, cultura, supervision.equipo, …) al clampear.
      await api.patch(`/admin/tenants/${draft.value.id}`, {
        nombre: draft.value.nombre,
        allowDesktop: draft.value.allowDesktop,
        activo: draft.value.activo,
        pack: draft.value.pack,
        licensedCapabilities: licensed,
      })
      msg.value = 'Suscriptor actualizado'
      draft.value = null
    } else {
      saving.value = true
      const { data } = await api.post(
        '/admin/tenants',
        {
          empCodigo: draft.value.empCodigo,
          nombre: draft.value.nombre,
          allowDesktop: draft.value.allowDesktop !== false,
          pack: draft.value.pack,
          capabilities: licensed,
          websiteUrl: draft.value.websiteUrl || undefined,
          notes: draft.value.notes || undefined,
        },
        { timeout: 120000 },
      )
      const seed = data.seed || {}
      const onboarding = seed.onboarding || data.tenant?.onboarding
      msg.value = seed.ok
        ? `Suscriptor creado${seed.knownCompany ? ' con perfil del cliente' : ''}`
        : 'Suscriptor creado (preparación parcial)'
      draft.value = null
      seedInfo.value = {
        tenant: data.tenant,
        onboarding: onboarding || {
          knownCompany: seed.knownCompany,
          industry: seed.industry,
          description: seed.description,
          credentials: seed.credentials,
          accessMessage: seed.accessMessage,
        },
      }
    }
    await load()
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

async function toggleActivo(t) {
  await api.patch(`/admin/tenants/${t.id}`, { activo: !t.activo })
  await load()
}

onMounted(load)
</script>
