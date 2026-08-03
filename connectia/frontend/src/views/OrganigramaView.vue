<template>
  <div class="org">
    <header class="org-hero">
      <div>
        <p class="org-kicker">Quién es quién</p>
        <h1>Organigrama</h1>
      </div>
      <div class="org-toggle" role="group" aria-label="Vista">
        <button type="button" :class="{ on: mode === 'people' }" @click="mode = 'people'">Personas</button>
        <button type="button" :class="{ on: mode === 'areas' }" @click="mode = 'areas'">Áreas</button>
      </div>
    </header>

    <div class="org-search-wrap">
      <input
        v-model="q"
        type="search"
        class="org-search"
        :placeholder="mode === 'people' ? 'Buscar persona, cargo o área…' : 'Buscar área…'"
        autocomplete="off"
        @input="onSearch"
      />
    </div>

    <p v-if="error" class="org-err">{{ error }}</p>
    <p v-else-if="loading" class="org-muted">Cargando organigrama…</p>

    <template v-else-if="mode === 'people'">
      <p v-if="!peopleTree.length" class="org-empty">
        <strong>Sin líneas de reporte</strong>
        <span>Cuando RRHH asigne “reporta a” en Usuarios, vas a ver el árbol acá.</span>
      </p>
      <ul v-else class="org-tree">
        <OrgPersonNode v-for="n in peopleTree" :key="n.id" :node="n" :depth="0" @select="openPerson" />
      </ul>
    </template>

    <template v-else>
      <p v-if="!areasTree.length" class="org-empty">
        <strong>Sin áreas</strong>
        <span>El administrador puede crearlas en Organización.</span>
      </p>
      <ul v-else class="org-areas">
        <li v-for="a in filteredAreas" :key="a.id" class="area-card" :style="{ marginLeft: `${depthOf(a) * 0.75}rem` }">
          <strong>{{ a.nombre }}</strong>
          <span>{{ a.memberCount || 0 }} personas</span>
          <p v-if="a.descripcion">{{ a.descripcion }}</p>
        </li>
      </ul>
    </template>

    <div v-if="selected" class="sheet" @click.self="selected = null">
      <div class="sheet-card">
        <button type="button" class="sheet-close" @click="selected = null">×</button>
        <div class="sheet-avatar">
          <img v-if="selected.avatarUrl" :src="selected.avatarUrl" alt="" />
          <span v-else>{{ initials(selected.displayName) }}</span>
        </div>
        <h2>{{ selected.displayName }}</h2>
        <p v-if="selected.cargo">{{ selected.cargo }}</p>
        <p v-if="selected.areaNombre" class="org-muted">{{ selected.areaNombre }}</p>
        <router-link class="sheet-link" :to="{ path: '/directorio', query: { q: selected.displayName } }">
          Ver en directorio
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import OrgPersonNode from '../components/OrgPersonNode.vue'

const loading = ref(true)
const error = ref('')
const q = ref('')
const mode = ref('people')
const chart = ref(null)
const selected = ref(null)
let searchTimer = null

const peopleTree = computed(() => chart.value?.people?.tree || [])
const areasTree = computed(() => chart.value?.areas?.tree || [])

const flatAreas = computed(() => {
  const out = []
  const walk = (nodes, depth) => {
    for (const n of nodes || []) {
      out.push({ ...n, _depth: depth })
      walk(n.children, depth + 1)
    }
  }
  walk(areasTree.value, 0)
  return out
})

const filteredAreas = computed(() => {
  const needle = q.value.trim().toLowerCase()
  if (!needle) return flatAreas.value
  return flatAreas.value.filter((a) => String(a.nombre || '').toLowerCase().includes(needle))
})

function depthOf(a) {
  return a._depth || 0
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')
}

function openPerson(node) {
  selected.value = node
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (q.value.trim() && mode.value === 'people') params.q = q.value.trim()
    chart.value = (await api.get('/org/chart', { params })).data
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'No se pudo cargar el organigrama'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (mode.value === 'people') load()
  }, 280)
}

onMounted(load)
</script>

<style scoped>
.org {
  padding: 1rem 1rem 2.5rem;
  max-width: 40rem;
  margin: 0 auto;
}
.org-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.org-kicker {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}
.org-hero h1 {
  margin: 0.15rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}
.org-toggle {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  background: #fff;
}
.org-toggle button {
  border: 0;
  background: transparent;
  padding: 0.4rem 0.75rem;
  font-size: 0.8125rem;
  color: #64748b;
  cursor: pointer;
}
.org-toggle button.on {
  background: var(--brand-primary, #0f766e);
  color: #fff;
}
.org-search-wrap {
  margin-bottom: 1rem;
}
.org-search {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.7rem 0.9rem;
  font-size: 0.9375rem;
}
.org-muted {
  color: #64748b;
  font-size: 0.875rem;
}
.org-err {
  color: #b91c1c;
  font-size: 0.875rem;
}
.org-empty {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1.25rem;
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  color: #64748b;
  font-size: 0.875rem;
}
.org-empty strong {
  color: #0f172a;
}
.org-tree,
.org-areas {
  list-style: none;
  margin: 0;
  padding: 0;
}
.area-card {
  padding: 0.75rem 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
  margin-bottom: 0.5rem;
}
.area-card strong {
  display: block;
  color: #0f172a;
}
.area-card span {
  font-size: 0.75rem;
  color: #64748b;
}
.area-card p {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  color: #475569;
}
.sheet {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 40;
  padding: 1rem;
}
.sheet-card {
  width: min(24rem, 100%);
  background: #fff;
  border-radius: 1rem 1rem 0.5rem 0.5rem;
  padding: 1.25rem;
  position: relative;
  text-align: center;
}
.sheet-close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  border: 0;
  background: transparent;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
}
.sheet-avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 999px;
  margin: 0.25rem auto 0.75rem;
  background: #e2e8f0;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-weight: 700;
  color: #334155;
}
.sheet-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sheet-card h2 {
  margin: 0;
  font-size: 1.125rem;
}
.sheet-link {
  display: inline-block;
  margin-top: 1rem;
  color: var(--brand-primary, #0f766e);
  font-weight: 600;
  text-decoration: none;
}
</style>
