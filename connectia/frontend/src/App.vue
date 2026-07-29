<template>
  <RouterView />
  <SplashScreen />
</template>

<script setup>
import { onMounted } from 'vue'
import SplashScreen from './components/SplashScreen.vue'
import { useAuthStore } from './stores/auth'
import { useSplashStore } from './stores/splash'

const auth = useAuthStore()
const splash = useSplashStore()

onMounted(() => {
  if (auth.isAuthenticated) {
    splash.play('post')
  }
})
</script>
