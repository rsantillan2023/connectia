<template>
  <Teleport to="body">
    <Transition name="splash">
      <div
        v-if="splash.visible"
        class="splash"
        :style="splashStyle"
        role="status"
        aria-live="polite"
        aria-label="Cargando"
      >
        <div class="splash-inner">
          <img
            v-if="splash.showLogo && splash.logoUrl"
            class="splash-logo"
            :src="splash.logoUrl"
            alt=""
          />
          <img
            v-else-if="splash.showLogo"
            class="splash-logo splash-logo--product"
            :src="PRODUCT_ICON"
            alt=""
          />
          <p v-if="splash.showTitle" class="splash-title">{{ splash.title }}</p>
          <p v-if="splash.showSubtitle" class="splash-sub">{{ splash.subtitle }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useSplashStore } from '../stores/splash'
import { PRODUCT_ICON } from '../constants/brand'

const splash = useSplashStore()

const splashStyle = computed(() => {
  const primary = splash.primary || 'var(--brand-primary, #0f766e)'
  const text = splash.textColor || primary
  const style = {
    '--splash-primary': primary,
    '--splash-text': text,
  }
  if (splash.bgImageUrl) {
    style.backgroundImage = `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.65)), url(${splash.bgImageUrl})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  } else if (splash.bgColor) {
    style.background = splash.bgColor
  } else {
    style.background = `radial-gradient(900px 500px at 50% 20%, color-mix(in srgb, ${primary} 35%, transparent), transparent 60%), var(--cx-page, #0b1220)`
  }
  return style
})
</script>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  color: var(--cx-text, #e2e8f0);
}

.splash-inner {
  text-align: center;
  padding: 24px;
  animation: splash-in 0.45s ease both;
}

.splash-logo {
  max-width: min(220px, 70vw);
  max-height: 72px;
  width: auto;
  height: auto;
  object-fit: contain;
  margin: 0 auto 16px;
  display: block;
}

.splash-logo--product {
  max-height: 96px;
  border-radius: 18px;
}

.splash-mark {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(
    135deg,
    var(--splash-primary),
    color-mix(in srgb, var(--splash-primary) 55%, #0f172a)
  );
}

.splash-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.75rem;
  line-height: 1.15;
  color: var(--splash-text);
}

.splash-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--cx-muted, #94a3b8);
}

@keyframes splash-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.splash-enter-active,
.splash-leave-active {
  transition: opacity 0.28s ease;
}
.splash-enter-from,
.splash-leave-to {
  opacity: 0;
}
</style>
