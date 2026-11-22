<script setup lang="ts">
import { onMounted, ref } from 'vue'
import App from './App.vue'
import { currentUser, signIn, signOut, type SessionUser } from './auth'

const user = ref<SessionUser | null>()
const username = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'No se pudo conectar. Intenta de nuevo.'
  } finally {
    busy.value = false
  }
}

function restoreSession() {
  return run(async () => {
    user.value = await currentUser()
  })
}

function login() {
  return run(async () => {
    try {
      user.value = await signIn(username.value, password.value)
      username.value = ''
    } finally {
      password.value = ''
    }
  })
}

function logout() {
  return run(async () => {
    await signOut()
    user.value = null
  })
}

onMounted(restoreSession)
</script>

<template>
  <header class="topbar">
    <div class="shell brand">
      <span aria-hidden="true">P</span> Estacionamiento
      <div v-if="user" class="session-actions">
        <strong>{{ user.username }}</strong>
        <button class="secondary" :disabled="busy" @click="logout">Cerrar sesión</button>
      </div>
    </div>
  </header>
  <div v-if="error" class="shell">
    <p class="message error" role="alert">{{ error }}</p>
  </div>
  <App v-if="user" />
  <main v-else class="shell">
    <template v-if="user === undefined">
      <p v-if="busy" role="status">Comprobando sesión…</p>
      <button v-else @click="restoreSession">Reintentar</button>
    </template>
    <section v-else class="panel login-panel">
      <h1>Iniciar sesión</h1>
      <form @submit.prevent="login">
        <label for="username">Usuario</label>
        <input id="username" v-model.trim="username" autocomplete="username" required :disabled="busy">
        <label for="password">Contraseña</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required :disabled="busy">
        <button :disabled="busy">{{ busy ? 'Iniciando sesión…' : 'Iniciar sesión' }}</button>
      </form>
    </section>
  </main>
</template>
