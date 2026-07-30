<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'

const loading = ref(true)
const sending = ref(false)
const err = ref('')
const ok = ref('')
const meta = ref({ categories: [], articles: [] })
const items = ref([])
const filterSource = ref('')
const form = ref({
  categoryId: '',
  note: '',
  articleId: '',
  qty: 1,
})

async function load() {
  loading.value = true
  err.value = ''
  try {
    const params = {}
    if (filterSource.value) params.source = filterSource.value
    const [m, list] = await Promise.all([
      api.get('/pedidos/meta'),
      api.get('/pedidos', { params }),
    ])
    meta.value = m.data
    items.value = list.data.items || []
    if (!form.value.categoryId && m.data.categories?.[0]) {
      form.value.categoryId = m.data.categories[0].id
    }
    if (!form.value.articleId && m.data.articles?.[0]) {
      form.value.articleId = m.data.articles[0].id
    }
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (sending.value) return
  sending.value = true
  err.value = ''
  ok.value = ''
  try {
    const idem =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cat-${Date.now()}`
    const payload = {
      categoryId: form.value.categoryId,
      note: form.value.note.trim(),
      items: form.value.articleId
        ? [{ articleId: form.value.articleId, qty: Number(form.value.qty) || 1 }]
        : [],
      idempotencyKey: idem,
    }
    const { data } = await api.post('/pedidos', payload, {
      headers: { 'Idempotency-Key': idem },
    })
    ok.value = `Pedido #${data.item.number} creado`
    form.value.note = ''
    await load()
  } catch (e) {
    err.value = e.response?.data?.error || e.message
  } finally {
    sending.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="pd">
    <header class="pd-head">
      <h1>Pedidos</h1>
      <p>Solicitá insumos o servicios internos de campo.</p>
    </header>

    <p v-if="err" class="pd-err">{{ err }}</p>
    <p v-if="ok" class="pd-ok">{{ ok }}</p>

    <div class="pd-card">
      <h2 class="pd-sub">Nuevo pedido</h2>
      <label class="pd-label">
        Categoría
        <select v-model="form.categoryId" class="pd-input">
          <option v-for="c in meta.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <label class="pd-label">
        Artículo
        <select v-model="form.articleId" class="pd-input">
          <option value="">— sin artículo —</option>
          <option v-for="a in meta.articles" :key="a.id" :value="a.id">
            {{ a.label }} ({{ a.unit }})
          </option>
        </select>
      </label>
      <label class="pd-label">
        Cantidad
        <input v-model.number="form.qty" class="pd-input" type="number" min="1" />
      </label>
      <label class="pd-label">
        Nota
        <textarea v-model="form.note" class="pd-input" rows="2" />
      </label>
      <button type="button" class="pd-primary" :disabled="sending || loading" @click="submit">
        {{ sending ? 'Enviando…' : 'Confirmar pedido' }}
      </button>
    </div>

    <div class="pd-filters">
      <select v-model="filterSource" class="pd-input" @change="load">
        <option value="">Todos</option>
        <option value="catalog">Catálogo</option>
        <option value="alarm">Reportes / alarma</option>
      </select>
    </div>

    <ul v-if="items.length" class="pd-list">
      <li v-for="p in items" :key="p.id" class="pd-item">
        <strong>#{{ p.number }}</strong>
        <span class="pd-src">{{ p.source }}</span>
        · {{ p.status }}
        <span v-if="p.categoryName"> · {{ p.categoryName }}</span>
        <p v-if="p.note" class="pd-meta">{{ p.note }}</p>
        <p v-if="p.items?.length" class="pd-meta">
          {{ p.items.map((i) => `${i.qty}× ${i.label}`).join(', ') }}
        </p>
      </li>
    </ul>
    <p v-else-if="!loading" class="pd-meta">Sin pedidos todavía.</p>
  </section>
</template>

<style scoped>
.pd {
  padding: 1rem 1rem 5rem;
  max-width: 32rem;
  margin: 0 auto;
}
.pd-head h1 {
  margin: 0;
  font-size: 1.35rem;
}
.pd-head p {
  margin: 0.35rem 0 1rem;
  color: #64748b;
  font-size: 0.9rem;
}
.pd-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  display: grid;
  gap: 0.65rem;
  margin-bottom: 1rem;
}
.pd-sub {
  margin: 0;
  font-size: 1rem;
}
.pd-label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.pd-input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.5rem 0.6rem;
  font: inherit;
}
.pd-primary {
  background: #0f766e;
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}
.pd-filters {
  margin-bottom: 0.75rem;
}
.pd-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.55rem;
}
.pd-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem;
  font-size: 0.9rem;
}
.pd-src {
  font-size: 0.7rem;
  background: #e2e8f0;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  margin-left: 0.25rem;
}
.pd-meta {
  color: #64748b;
  font-size: 0.8rem;
  margin: 0.25rem 0 0;
}
.pd-err {
  color: #b91c1c;
}
.pd-ok {
  color: #047857;
  font-weight: 600;
}
</style>
