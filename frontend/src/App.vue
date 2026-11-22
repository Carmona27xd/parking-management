<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { parkingRequest } from './api'

interface Stay {
  id: number
  plate: string
  enteredAt: string
  exitedAt: string | null
  amount: number | null
}

interface Dashboard {
  capacity: number
  hourlyRate: number
  active: Stay[]
  recent: Stay[]
}

const dashboard = ref<Dashboard>()
const plate = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const date = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' })

async function refresh() {
  dashboard.value = await parkingRequest<Dashboard>()
}

async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await action()
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Ocurrió un error.'
  } finally {
    busy.value = false
  }
}

function registerEntry() {
  return run(async () => {
    const stay = await parkingRequest<Stay>('/stays', { plate: plate.value })
    plate.value = ''
    notice.value = 'Entrada registrada para ' + stay.plate + '.'
    await refresh()
  })
}

function registerExit(id: number) {
  return run(async () => {
    const stay = await parkingRequest<Stay>('/stays/' + id + '/exit', {})
    notice.value = 'Salida de ' + stay.plate + ' registrada. Total: ' + money.format(stay.amount ?? 0) + ' MXN.'
    await refresh()
  })
}

onMounted(() => run(refresh))
</script>

<template>
  <main class="shell">
    <h1>Operación</h1>
    <p v-if="error" class="message error" role="alert">{{ error }}</p>
    <p v-if="notice" class="message notice" role="status">{{ notice }}</p>
    <template v-if="dashboard">
      <div class="summary">
        <div><span>Lugares disponibles</span><strong>{{ dashboard.capacity - dashboard.active.length }}</strong></div>
        <div><span>Ocupación</span><strong>{{ dashboard.active.length }} / {{ dashboard.capacity }}</strong></div>
        <div><span>Tarifa por hora iniciada</span><strong>{{ money.format(dashboard.hourlyRate) }} <small>MXN</small></strong></div>
      </div>
      <section class="panel">
        <h2>Registrar entrada</h2>
        <form @submit.prevent="registerEntry">
          <label for="plate">Placa</label>
          <div class="entry-fields">
            <input id="plate" v-model.trim="plate" maxlength="20" placeholder="ABC-123" autocomplete="off" required>
            <button :disabled="busy || dashboard.active.length >= dashboard.capacity">Registrar entrada</button>
          </div>
          <p v-if="dashboard.active.length >= dashboard.capacity" class="muted">El estacionamiento está lleno.</p>
        </form>
      </section>
      <section class="panel">
        <h2>Vehículos dentro</h2>
        <p v-if="!dashboard.active.length" class="muted">No hay vehículos estacionados.</p>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Placa</th><th>Entrada</th><th>Acción</th></tr></thead>
            <tbody>
              <tr v-for="stay in dashboard.active" :key="stay.id">
                <td><strong class="plate">{{ stay.plate }}</strong></td>
                <td>{{ date.format(new Date(stay.enteredAt)) }}</td>
                <td><button class="secondary" :disabled="busy" @click="registerExit(stay.id)"
                  :aria-label="'Registrar salida de ' + stay.plate">Registrar salida</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel">
        <h2>Salidas recientes</h2>
        <p v-if="!dashboard.recent.length" class="muted">Aún no hay salidas registradas.</p>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Placa</th><th>Salida</th><th>Importe</th></tr></thead>
            <tbody>
              <tr v-for="stay in dashboard.recent" :key="stay.id">
                <td><strong class="plate">{{ stay.plate }}</strong></td>
                <td>{{ stay.exitedAt && date.format(new Date(stay.exitedAt)) }}</td>
                <td>{{ stay.amount !== null && money.format(stay.amount) }} MXN</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
    <p v-else-if="busy" role="status">Cargando estacionamiento…</p>
    <button v-else @click="run(refresh)">Reintentar</button>
  </main>
</template>
