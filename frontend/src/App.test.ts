// @vitest-environment jsdom
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App.vue'

enableAutoUnmount(afterEach)
afterEach(() => vi.unstubAllGlobals())

const empty = { capacity: 12, hourlyRate: 25, active: [], recent: [] }
const active = { id: 1, plate: 'ABC123', enteredAt: '2026-11-21T15:00:00Z' }
const exited = { ...active, exitedAt: '2026-11-21T15:30:00Z', amount: 25 }

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

it('registra una entrada y una salida y actualiza el panel', async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json(empty))
    .mockResolvedValueOnce(Response.json(active, { status: 201 }))
    .mockResolvedValueOnce(Response.json({ ...empty, active: [active] }))
    .mockResolvedValueOnce(Response.json(exited))
    .mockResolvedValueOnce(Response.json({ ...empty, recent: [exited] }))

  const view = mount(App)
  await flushPromises()
  expect(view.text()).toContain('0 / 12')

  await view.get('#plate').setValue('ABC-123')
  await view.get('form').trigger('submit')
  await flushPromises()

  expect(view.text()).toContain('1 / 12')
  expect(view.get('.notice').text()).toContain('Entrada registrada para ABC123')

  await view.get('button[aria-label="Registrar salida de ABC123"]').trigger('click')
  await flushPromises()

  expect(view.text()).toContain('0 / 12')
  expect(view.get('.notice').text()).toContain('Salida de ABC123 registrada')
  expect(view.get('tbody').text()).toContain('ABC123')
  expect(view.get('tbody').text()).toContain('25.00')
})

it('muestra el conflicto y conserva la placa para corregirla', async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json(empty))
    .mockResolvedValueOnce(Response.json({ detail: 'La placa ya está dentro.' }, { status: 409 }))

  const view = mount(App)
  await flushPromises()
  const input = view.get<HTMLInputElement>('#plate')
  await input.setValue('ABC-123')
  await view.get('form').trigger('submit')
  await flushPromises()

  expect(view.get('[role="alert"]').text()).toContain('La placa ya está dentro.')
  expect(input.element.value).toBe('ABC-123')
})
