<template>
  <li class="org-li" :class="{ root: isRoot }">
    <div class="org-card" :class="{ inactive: !node.activo }">
      <p class="org-name">{{ node.nombre }}</p>
      <p class="org-key">{{ node.key }}</p>
      <p v-if="node.descripcion" class="org-desc">{{ node.descripcion }}</p>
      <div class="org-actions">
        <button type="button" @click="$emit('edit', node)">Editar</button>
        <button v-if="node.activo" type="button" class="warn" @click="$emit('deactivate', node)">
          Desactivar
        </button>
      </div>
    </div>
    <ul v-if="node.children?.length" class="org-children">
      <OrgAreaChartNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :is-root="false"
        @edit="$emit('edit', $event)"
        @deactivate="$emit('deactivate', $event)"
      />
    </ul>
  </li>
</template>

<script setup>
defineProps({
  node: { type: Object, required: true },
  isRoot: { type: Boolean, default: false },
})
defineEmits(['edit', 'deactivate'])
</script>

<style scoped>
.org-li {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.org-li:not(.root) {
  padding-top: 1rem;
}
.org-li:not(.root)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 1rem;
  background: var(--line-2);
}
.org-card {
  position: relative;
  z-index: 1;
  width: 11.5rem;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--panel-2);
  text-align: center;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}
.org-card.inactive {
  opacity: 0.55;
}
.org-name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
}
.org-key {
  margin: 0.2rem 0 0;
  font-family: ui-monospace, monospace;
  font-size: 0.7rem;
  color: var(--ink-soft);
}
.org-desc {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--ink-soft);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.org-actions {
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}
.org-actions button {
  font-size: 0.75rem;
  color: var(--brand-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.org-actions .warn {
  color: var(--warn);
}
.org-children {
  display: flex;
  justify-content: center;
  gap: 1rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 1rem 0 0;
  position: relative;
}
.org-children::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 1rem;
  background: var(--line-2);
}
.org-children :deep(> .org-li)::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--line-2);
}
.org-children :deep(> .org-li:first-child)::after {
  left: 50%;
}
.org-children :deep(> .org-li:last-child)::after {
  right: 50%;
}
.org-children :deep(> .org-li:only-child)::after {
  display: none;
}
</style>
