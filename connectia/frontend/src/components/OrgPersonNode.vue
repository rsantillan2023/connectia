<template>
  <li class="node">
    <button type="button" class="card" @click="$emit('select', node)">
      <div class="avatar">
        <img v-if="node.avatarUrl" :src="node.avatarUrl" alt="" />
        <span v-else>{{ initials }}</span>
      </div>
      <div class="meta">
        <strong>{{ node.displayName }}</strong>
        <span v-if="node.cargo">{{ node.cargo }}</span>
        <span v-if="node.areaNombre" class="area">{{ node.areaNombre }}</span>
      </div>
      <span v-if="node.reports?.length" class="badge">{{ node.reports.length }}</span>
    </button>
    <ul v-if="node.reports?.length" class="kids">
      <OrgPersonNode
        v-for="child in node.reports"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @select="$emit('select', $event)"
      />
    </ul>
  </li>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

defineEmits(['select'])

const initials = computed(() =>
  String(props.node.displayName || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join(''),
)
</script>

<style scoped>
.node {
  list-style: none;
}
.card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 0.85rem;
  padding: 0.65rem 0.75rem;
  margin-bottom: 0.45rem;
  cursor: pointer;
}
.card:active {
  transform: scale(0.99);
}
.avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: #e2e8f0;
  display: grid;
  place-items: center;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #334155;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.meta strong {
  font-size: 0.9375rem;
  color: #0f172a;
}
.meta span {
  font-size: 0.75rem;
  color: #64748b;
}
.meta .area {
  color: var(--brand-primary, #0f766e);
}
.badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--brand-primary, #0f766e);
  background: #ccfbf1;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
}
.kids {
  margin: 0 0 0 0.85rem;
  padding: 0 0 0 0.65rem;
  border-left: 2px solid #e2e8f0;
  list-style: none;
}
</style>
