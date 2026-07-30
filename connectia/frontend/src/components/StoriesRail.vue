<template>
  <section v-if="categories.length" class="stories-rail" aria-label="Stories">
    <div class="stories-scroll">
      <button
        v-for="cat in categories"
        :key="cat.category"
        type="button"
        class="story-bubble"
        :class="{ seen: cat.allSeen }"
        :aria-label="`Stories ${cat.category}`"
        @click="openCategory(cat)"
      >
        <span class="story-ring">
          <img
            v-if="cat.cover && cat.coverType !== 'video'"
            :src="cat.cover"
            alt=""
            class="story-thumb"
          />
          <span v-else class="story-thumb story-thumb-fallback">{{ cat.initial }}</span>
        </span>
        <span class="story-label">{{ cat.category }}</span>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="viewer"
        class="story-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="Story"
        @click.self="closeViewer"
      >
        <div class="story-viewer-inner">
          <div class="story-progress">
            <span
              v-for="(s, i) in viewer.stories"
              :key="s.id"
              class="story-bar"
              :class="{ done: i < viewer.index, on: i === viewer.index }"
            />
          </div>
          <header class="story-viewer-head">
            <div>
              <strong>{{ viewer.category }}</strong>
              <small>{{ current?.titulo || 'Story' }}</small>
            </div>
            <button type="button" class="story-close" aria-label="Cerrar" @click="closeViewer">×</button>
          </header>
          <div class="story-media" @click="advance">
            <video
              v-if="current?.mediaType === 'video'"
              :src="mediaUrl(current.mediaUrl)"
              autoplay
              playsinline
              muted
              class="story-media-el"
              @ended="advance"
            />
            <img
              v-else-if="current"
              :src="mediaUrl(current.mediaUrl)"
              :alt="current.titulo || ''"
              class="story-media-el"
            />
          </div>
          <button type="button" class="story-nav prev" aria-label="Anterior" @click.stop="back">‹</button>
          <button type="button" class="story-nav next" aria-label="Siguiente" @click.stop="advance">›</button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import api from '../services/api'
import { resolveMediaUrl } from '../utils/media'

const categories = ref([])
const viewer = ref(null)
let autoTimer

const current = computed(() => {
  if (!viewer.value) return null
  return viewer.value.stories[viewer.value.index] || null
})

function mediaUrl(u) {
  return resolveMediaUrl(u)
}

async function load() {
  try {
    const { data } = await api.get('/stories')
    const cats = Array.isArray(data?.categories) ? data.categories : []
    categories.value = cats.map((c) => {
      const stories = c.stories || []
      const first = stories[0]
      return {
        category: c.category || 'general',
        stories,
        cover: first ? resolveMediaUrl(first.mediaUrl) : '',
        coverType: first?.mediaType || 'image',
        initial: String(c.category || 'S').slice(0, 1).toUpperCase(),
        allSeen: stories.length > 0 && stories.every((s) => s.viewed),
      }
    })
  } catch {
    categories.value = []
  }
}

function openCategory(cat) {
  viewer.value = {
    category: cat.category,
    stories: cat.stories,
    index: 0,
  }
  markView()
  armTimer()
}

function closeViewer() {
  clearTimeout(autoTimer)
  viewer.value = null
}

async function markView() {
  const s = current.value
  if (!s?.id) return
  try {
    await api.post(`/stories/${s.id}/view`)
    s.viewed = true
  } catch {
    /* ignore */
  }
}

function armTimer() {
  clearTimeout(autoTimer)
  if (!viewer.value || current.value?.mediaType === 'video') return
  autoTimer = setTimeout(advance, 5000)
}

function advance() {
  if (!viewer.value) return
  if (viewer.value.index >= viewer.value.stories.length - 1) {
    closeViewer()
    return
  }
  viewer.value.index += 1
  markView()
  armTimer()
}

function back() {
  if (!viewer.value) return
  if (viewer.value.index <= 0) return
  viewer.value.index -= 1
  armTimer()
}

onMounted(load)
onUnmounted(() => clearTimeout(autoTimer))

defineExpose({ reload: load })
</script>

<style scoped>
.stories-rail {
  margin: 0 0 12px;
  padding: 0 4px;
}
.stories-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 2px 8px;
  scrollbar-width: none;
}
.stories-scroll::-webkit-scrollbar {
  display: none;
}
.story-bubble {
  flex: 0 0 auto;
  width: 72px;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: center;
}
.story-ring {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 6px;
  border-radius: 999px;
  padding: 2px;
  background: linear-gradient(135deg, #0d9488, #f59e0b);
}
.story-bubble.seen .story-ring {
  background: #cbd5e1;
}
.story-thumb {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid var(--u-surface, #fff);
  background: #e2e8f0;
}
.story-thumb-fallback {
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #0f766e;
}
.story-label {
  display: block;
  font-size: 11px;
  color: var(--u-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.story-viewer {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(2, 6, 23, 0.92);
  display: grid;
  place-items: center;
  padding: 12px;
}
.story-viewer-inner {
  position: relative;
  width: min(420px, 100%);
  height: min(720px, 100%);
  border-radius: 16px;
  overflow: hidden;
  background: #0f172a;
}
.story-progress {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 2;
  display: flex;
  gap: 4px;
}
.story-bar {
  flex: 1;
  height: 3px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.25);
}
.story-bar.done,
.story-bar.on {
  background: #fff;
}
.story-viewer-head {
  position: absolute;
  top: 22px;
  left: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  color: #fff;
}
.story-viewer-head small {
  display: block;
  opacity: 0.8;
  margin-top: 2px;
}
.story-close {
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.story-media {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}
.story-media-el {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}
.story-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  width: 36px;
  height: 56px;
  border-radius: 10px;
  font-size: 24px;
  cursor: pointer;
}
.story-nav.prev {
  left: 8px;
}
.story-nav.next {
  right: 8px;
}
</style>
