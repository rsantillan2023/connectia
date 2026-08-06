<template>
  <div v-if="!roots.length" class="org-empty">
    <p>No hay áreas para mostrar.</p>
  </div>
  <div v-else class="org-chart-wrap">
    <p v-if="!hasHierarchy" class="org-hint">
      Todavía no hay jerarquía: todas las áreas aparecen como raíz. Al editar, podés asignar un
      <strong>área padre</strong> (opcional) para armar el organigrama.
    </p>
    <ul class="org-chart">
      <OrgAreaChartNode
        v-for="node in roots"
        :key="node.id"
        :node="node"
        :is-root="true"
        @edit="$emit('edit', $event)"
        @deactivate="$emit('deactivate', $event)"
      />
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import OrgAreaChartNode from './OrgAreaChartNode.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

defineEmits(['edit', 'deactivate'])

function buildTree(areas) {
  const list = Array.isArray(areas) ? areas : []
  const byId = new Map(
    list.map((a) => [
      String(a.id),
      { ...a, id: String(a.id), parentId: a.parentId ? String(a.parentId) : null, children: [] },
    ]),
  )
  const roots = []
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId).children.push(node)
    else roots.push(node)
  }
  const byOrden = (a, b) =>
    (a.orden ?? 100) - (b.orden ?? 100) || String(a.nombre || '').localeCompare(String(b.nombre || ''))
  const sortRec = (nodes) => {
    nodes.sort(byOrden)
    for (const n of nodes) sortRec(n.children)
  }
  sortRec(roots)
  return roots
}

const roots = computed(() => buildTree(props.items))
const hasHierarchy = computed(() => props.items.some((a) => a.parentId))
</script>

<style scoped>
.org-empty {
  margin-top: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--panel);
  color: var(--ink-soft);
  font-size: 0.875rem;
}
.org-chart-wrap {
  margin-top: 1rem;
  overflow-x: auto;
  padding: 1rem 0.5rem 1.5rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--panel);
}
.org-hint {
  margin: 0 0.75rem 1rem;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  line-height: 1.4;
}
.org-chart {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
  min-width: max-content;
}
</style>
