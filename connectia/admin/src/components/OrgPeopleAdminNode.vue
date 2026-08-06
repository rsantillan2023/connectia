<template>
  <li class="node">
    <div class="row">
      <div class="avatar">
        <img v-if="node.avatarUrl" :src="node.avatarUrl" alt="" />
        <span v-else>{{ initials }}</span>
      </div>
      <div>
        <p class="name">{{ node.displayName }}</p>
        <p class="meta">
          <span v-if="node.cargo">{{ node.cargo }}</span>
          <span v-if="node.areaNombre"> · {{ node.areaNombre }}</span>
        </p>
      </div>
    </div>
    <ul v-if="node.reports?.length" class="kids">
      <OrgPeopleAdminNode v-for="c in node.reports" :key="c.id" :node="c" />
    </ul>
  </li>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: { type: Object, required: true },
})

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
.row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0;
}
.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--line);
  display: grid;
  place-items: center;
  overflow: hidden;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--ink);
  flex-shrink: 0;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
}
.meta {
  margin: 0;
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.kids {
  margin: 0 0 0 0.75rem;
  padding: 0 0 0 0.75rem;
  border-left: 2px solid var(--line);
  list-style: none;
}
</style>
