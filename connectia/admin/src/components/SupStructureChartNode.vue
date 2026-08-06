<template>
  <li class="sg-li" :class="{ root: isRoot }">
    <div class="sg-card" :class="['sg-card--' + node.kind, { off: node.off }]">
      <span class="sg-kind">{{ kindLabel(node.kind) }}</span>
      <p class="sg-name" :title="node.nombre">{{ node.nombre }}</p>
      <p v-if="node.meta" class="sg-meta">{{ node.meta }}</p>
      <p v-if="node.children?.length" class="sg-count">
        {{ node.children.length }} hijo{{ node.children.length === 1 ? '' : 's' }}
      </p>
    </div>
    <ul v-if="node.children?.length" class="sg-children">
      <SupStructureChartNode
        v-for="child in node.children"
        :key="child.id + '-' + child.kind"
        :node="child"
        :is-root="false"
      />
    </ul>
  </li>
</template>

<script setup>
defineProps({
  node: { type: Object, required: true },
  isRoot: { type: Boolean, default: false },
})

function kindLabel(k) {
  return (
    {
      cadena: 'Cadena',
      subcadena: 'Subcadena',
      sala: 'Sala',
      cliente: 'Cliente',
      grupo: 'Grupo',
    }[k] || k
  )
}
</script>

<style scoped>
.sg-li {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.sg-li:not(.root) {
  padding-top: 1rem;
}
.sg-li:not(.root)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 1rem;
  background: var(--line);
}
.sg-card {
  position: relative;
  z-index: 1;
  width: 10.5rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  text-align: center;
  box-shadow: var(--sh, 0 1px 2px rgb(15 23 42 / 6%));
}
.sg-card.off {
  opacity: 0.62;
}
.sg-card--cadena {
  border-color: color-mix(in srgb, #0d9488 45%, var(--line));
}
.sg-card--subcadena {
  border-color: color-mix(in srgb, #6366f1 40%, var(--line));
}
.sg-card--sala {
  border-color: color-mix(in srgb, #ea580c 40%, var(--line));
}
.sg-card--cliente {
  border-color: color-mix(in srgb, #0284c7 40%, var(--line));
}
.sg-card--grupo {
  border-style: dashed;
}
.sg-kind {
  display: inline-block;
  font-size: 0.58rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  margin-bottom: 0.2rem;
}
.sg-name {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sg-meta,
.sg-count {
  margin: 0.2rem 0 0;
  font-size: 0.68rem;
  color: var(--ink-soft);
  line-height: 1.25;
}
.sg-children {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 1rem 0 0;
  position: relative;
}
.sg-children::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 1rem;
  background: var(--line);
}
</style>
