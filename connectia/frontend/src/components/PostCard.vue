<template>
  <article class="pcard" :data-layout="layout" :class="{ pinned: post.pinned && show.pinned }">
    <header v-if="showHeader" class="pcard-head">
      <div v-if="show.avatar" class="avatar" aria-hidden="true">{{ initials(post.authorName) }}</div>
      <div class="meta">
        <p v-if="show.authorName" class="author">
          {{ post.authorName || 'Comunidad' }}
          <span
            v-if="show.pinned && post.pinned"
            class="pinned-pin"
            title="Fijada"
            aria-label="Publicación fijada"
          >
            <AppIcon name="pin" :size="14" filled />
          </span>
        </p>
      </div>
      <span v-if="show.tipo && tipoLabel" class="tipo tipo-end">{{ tipoLabel }}</span>
      <button
        v-if="showMoreMenu"
        type="button"
        class="more-btn"
        aria-label="Más opciones"
        title="Más"
        @click.stop="optionsOpen = true"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
    </header>

    <!-- Banner -->
    <template v-if="layout === 'banner'">
      <div v-if="show.media && hasMedia" class="media-wrap">
        <div
          class="media media--banner"
          role="button"
          tabindex="0"
          @click="emitOpen"
          @keydown.enter.prevent="emitOpen"
        >
          <PostMediaCarousel v-if="isCarousel" :urls="mediaUrls" :alt="post.titulo" />
          <PostMedia v-else :url="mediaUrls[0]" :alt="post.titulo" />
          <div class="banner-overlay">
            <h2 v-if="show.title">{{ post.titulo }}</h2>
          </div>
        </div>
        <PostAudioButton :url="post.audioUrl" :media-url="mediaUrls[0]" />
      </div>
      <div class="pcard-body">
        <button
          v-if="show.title && !(show.media && hasMedia)"
          type="button"
          class="title-btn"
          @click="emitOpen"
        >
          <h2>{{ post.titulo }}</h2>
        </button>
        <p v-if="show.body && !compact" class="text" :class="{ clamp: truncate }">{{ post.cuerpo }}</p>
        <RouterLink
          v-if="post.linkedSurveyId"
          class="survey-cta"
          :to="`/encuestas/${post.linkedSurveyId}`"
          @click.stop
        >
          Responder encuesta
        </RouterLink>
        <p v-if="show.date && post.publishedAt" class="pcard-date">
          {{ formatPostDate(post.publishedAt) }}
        </p>
        <slot v-if="show.reactions" name="actions" />
      </div>
    </template>

    <!-- Horizontal -->
    <template v-else-if="layout === 'horizontal'">
      <div class="horizontal">
        <div v-if="show.media && hasMedia" class="media-wrap media-wrap--thumb">
          <div
            class="media media--thumb"
            role="button"
            tabindex="0"
            @click="emitOpen"
            @keydown.enter.prevent="emitOpen"
          >
            <PostMediaCarousel
              v-if="isCarousel"
              :urls="mediaUrls"
              :alt="post.titulo"
              :fallback-tipo="post.tipo"
            />
            <PostMedia v-else :url="mediaUrls[0]" :alt="post.titulo" :fallback-tipo="post.tipo" />
          </div>
          <PostAudioButton :url="post.audioUrl" :media-url="mediaUrls[0]" />
        </div>
        <div class="pcard-body">
          <button v-if="show.title" type="button" class="title-btn" @click="emitOpen">
            <h2>{{ post.titulo }}</h2>
          </button>
          <p v-if="show.body && !compact" class="text" :class="{ clamp: truncate }">{{ post.cuerpo }}</p>
          <RouterLink
            v-if="post.linkedSurveyId"
            class="survey-cta"
            :to="`/encuestas/${post.linkedSurveyId}`"
            @click.stop
          >
            Responder encuesta
          </RouterLink>
          <p v-if="show.date && post.publishedAt" class="pcard-date">
            {{ formatPostDate(post.publishedAt) }}
          </p>
          <slot v-if="show.reactions" name="actions" />
        </div>
      </div>
    </template>

    <!-- Vertical (default) -->
    <template v-else>
      <div v-if="show.media && hasMedia" class="media-wrap">
        <div
          class="media"
          :class="feedMediaClass"
          role="button"
          tabindex="0"
          @click="emitOpen"
          @keydown.enter.prevent="emitOpen"
        >
          <PostMediaCarousel v-if="isCarousel" :urls="mediaUrls" :alt="post.titulo" />
          <PostMedia v-else :url="mediaUrls[0]" :alt="post.titulo" />
        </div>
        <PostAudioButton :url="post.audioUrl" :media-url="mediaUrls[0]" />
      </div>
      <div class="pcard-body">
        <button v-if="show.title" type="button" class="title-btn" @click="emitOpen">
          <h2>{{ post.titulo }}</h2>
        </button>
        <p v-if="show.body && !compact" class="text" :class="{ clamp: truncate }">{{ post.cuerpo }}</p>
        <RouterLink
          v-if="post.linkedSurveyId"
          class="survey-cta"
          :to="`/encuestas/${post.linkedSurveyId}`"
          @click.stop
        >
          Responder encuesta
        </RouterLink>
        <p v-if="show.date && post.publishedAt" class="pcard-date">
          {{ formatPostDate(post.publishedAt) }}
        </p>
        <slot v-if="show.reactions" name="actions" />
      </div>
    </template>

    <PostOptionsSheet
      v-if="optionsOpen"
      @close="optionsOpen = false"
      @not-interested="onNotInterested"
    />
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from './AppIcon.vue'
import PostMedia from './PostMedia.vue'
import PostMediaCarousel from './PostMediaCarousel.vue'
import PostAudioButton from './PostAudioButton.vue'
import PostOptionsSheet from './PostOptionsSheet.vue'
import { formatPostDate, initials, mediaKind, postImageUrls, isPostCarousel, hasPostMedia } from '../utils/media'

const DEFAULT_SHOW = {
  avatar: true,
  authorName: true,
  tipo: true,
  title: true,
  body: true,
  date: true,
  pinned: true,
  media: true,
  reactions: true,
}

const props = defineProps({
  post: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  truncate: { type: Boolean, default: true },
  showMoreMenu: { type: Boolean, default: true },
})

const emit = defineEmits(['open', 'not-interested'])
const optionsOpen = ref(false)

const TIPO_LABELS = {
  noticia: 'Noticia',
  aviso: 'Aviso',
  beneficio: 'Beneficio',
  evento: 'Evento',
  celebracion: 'Celebración',
  general: 'General',
}
const tipoLabel = computed(() => TIPO_LABELS[props.post?.tipo] || props.post?.tipo || '')

const show = computed(() => ({ ...DEFAULT_SHOW, ...(props.post?.display?.show || {}) }))
const layout = computed(() => props.post?.layout || 'vertical')
const showHeader = computed(
  () =>
    show.value.avatar ||
    show.value.authorName ||
    show.value.tipo ||
    (show.value.pinned && props.post?.pinned),
)

const mediaUrls = computed(() => postImageUrls(props.post))
const isCarousel = computed(() => isPostCarousel(props.post))
const hasMedia = computed(() => hasPostMedia(props.post))

const feedMediaClass = computed(() => {
  if (isCarousel.value) return 'media--feed'
  const k = mediaKind(mediaUrls.value[0])
  if (k === 'embed' || k === 'video') return 'media--wide'
  return 'media--feed'
})

function emitOpen() {
  emit('open', props.post)
}

function onNotInterested() {
  optionsOpen.value = false
  emit('not-interested', props.post)
}
</script>

<style scoped>
.pcard {
  background: var(--cx-surface, #fff);
  border-bottom: 0;
  color: var(--cx-text, #0f172a);
  margin: 0 0 14px;
  border-radius: 0;
}
.pcard.pinned {
  /* sin franja vertical de color */
  box-shadow: none;
}
.pcard-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 8px;
}
.pcard-head .meta {
  flex: 1;
  min-width: 0;
}
.more-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--cx-text);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--brand-primary, #0f766e), var(--brand-secondary, #115e59));
}
.author {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
}
.pinned-pin {
  display: inline-flex;
  color: var(--brand-primary, #0f766e);
  flex-shrink: 0;
  line-height: 0;
}
.tipo {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brand-primary, #0f766e);
  font-weight: 700;
  font-size: 11px;
}
.tipo-end {
  flex-shrink: 0;
  margin-left: auto;
  text-align: right;
}
.pcard-date {
  margin: 8px 0 2px;
  padding: 0;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-transform: lowercase;
  color: #94a3b8;
}
.media-wrap {
  position: relative;
}
.media-wrap--thumb {
  min-height: 120px;
}
.media {
  display: block;
  width: 100%;
  border: 0;
  padding: 0;
  background: var(--cx-surface-2, #f8fafc);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
.media--feed {
  aspect-ratio: 4 / 5;
  max-height: 70vh;
}
.media--wide {
  aspect-ratio: 16 / 9;
  max-height: 70vh;
  background: #000;
}
.media--banner {
  aspect-ratio: 21 / 9;
}
.media--thumb {
  aspect-ratio: 1;
  min-height: 120px;
}
.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent 55%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
  text-align: left;
  pointer-events: none;
}
.banner-overlay h2 {
  margin: 4px 0 0;
  color: #fff;
  font-family: var(--font-display);
  font-size: 1.25rem;
  line-height: 1.2;
}
.horizontal {
  display: grid;
  grid-template-columns: 132px 1fr;
}
@media (max-width: 380px) {
  .horizontal {
    grid-template-columns: 1fr;
  }
}
.pcard-body {
  padding: 10px 14px 12px;
}
.title-btn {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  cursor: pointer;
}
.title-btn h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  line-height: 1.25;
  color: var(--cx-text, #0f172a);
}
.text {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--cx-muted, #64748b);
  white-space: pre-wrap;
}
.text.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.survey-cta {
  display: inline-flex;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-primary, #0f766e) 12%, transparent);
  color: var(--brand-primary, #0f766e);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
</style>
