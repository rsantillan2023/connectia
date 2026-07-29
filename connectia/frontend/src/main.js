import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import { usePwaInstall } from './composables/usePwaInstall'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Capturar beforeinstallprompt lo antes posible (flujo estándar de instalación)
usePwaInstall().init()

// autoUpdate: el SW se actualiza solo; al cambiar íconos/assets se refresca en visitas
registerSW({ immediate: true })
