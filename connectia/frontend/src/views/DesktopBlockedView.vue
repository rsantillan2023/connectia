<template>
  <div class="min-h-dvh flex items-center justify-center p-6 text-center">
    <div class="max-w-md">
      <p class="font-display text-3xl text-brand">Abrí Connectia en el celular</p>
      <p class="mt-3 text-slate-600 text-sm">
        Esta comunidad no permite usar la app desde escritorio. Escaneá el enlace o abrilo en tu teléfono.
      </p>
      <button class="mt-6 rounded-xl bg-brand text-white px-5 py-3 font-semibold" @click="auth.logout(); $router.push('/login')">
        Volver al ingreso
      </button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
</script>
