import assert from 'node:assert/strict'
import { randomInt } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

const base = process.env.PARKING_URL ?? 'http://127.0.0.1:8080'
const endpoint = base + '/api/parking'
const plate = 'QA' + randomInt(100000, 1000000)

async function post(path, data, status) {
  const response = await fetch(endpoint + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const body = await response.json()
  assert.equal(response.status, status, JSON.stringify(body))
  return body
}

const deadline = Date.now() + 60_000
let initial
while (!initial && Date.now() < deadline) {
  const response = await fetch(endpoint).catch(() => undefined)
  if (response?.ok) initial = await response.json()
  else await delay(1000)
}
assert.ok(initial, 'Spring Boot did not become ready')
const home = await fetch(base)
assert.equal(home.status, 200)
assert.match(await home.text(), /Estacionamiento/)

const entered = await post('/stays', { plate: plate.toLowerCase() }, 201)
assert.equal(entered.plate, plate)
await post('/stays', { plate }, 409)
const during = await (await fetch(endpoint)).json()
assert.equal(during.active.length, initial.active.length + 1)

const exited = await post('/stays/' + entered.id + '/exit', {}, 200)
assert.equal(exited.amount, entered.hourlyRate)
assert.ok(exited.exitedAt)
await post('/stays/' + entered.id + '/exit', {}, 409)

const after = await (await fetch(endpoint)).json()
assert.equal(after.active.length, initial.active.length)
assert.ok(after.recent.some(stay => stay.id === entered.id))
console.log('Entrada, duplicado, ocupación, salida, cobro e historial verificados.')
