// @vitest-environment jsdom
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import SessionApp from './SessionApp.vue'

enableAutoUnmount(afterEach)
afterEach(() => vi.unstubAllGlobals())

const fetchMock = vi.fn()
const account = { username: 'operador', roles: ['OPERATOR'] }
const csrf = (token: string) => Response.json({ headerName: 'X-CSRF-TOKEN', token })
const status = (code: number) => new Response(null, { status: code })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function openApp() {
  return mount(SessionApp, { global: { stubs: { App: { template: '<main>Operación</main>' } } } })
}

async function fillCredentials(view: ReturnType<typeof openApp>) {
  await view.get('#username').setValue('operador')
  await view.get('#password').setValue(' secreto + café ')
  await view.get('form').trigger('submit')
  await flushPromises()
}

it('inicia sesión y usa un token CSRF nuevo para cerrarla', async () => {
  fetchMock
    .mockResolvedValueOnce(status(401))
    .mockResolvedValueOnce(csrf('before-login'))
    .mockResolvedValueOnce(status(204))
    .mockResolvedValueOnce(Response.json(account))
    .mockResolvedValueOnce(csrf('after-login'))
    .mockResolvedValueOnce(status(204))

  const view = openApp()
  await flushPromises()
  expect(view.get('h1').text()).toBe('Iniciar sesión')
  expect(view.text()).not.toContain('Operación')
  await fillCredentials(view)

  expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/me')
  expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/csrf')
  expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/auth/login', {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': 'before-login' },
    body: expect.any(URLSearchParams),
  })
  expect(fetchMock.mock.calls[2]?.[1].body.toString()).toBe('username=operador&password=+secreto+%2B+caf%C3%A9+')
  expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/auth/me')
  expect(view.get('header').text()).toContain('operador')
  expect(view.get('main').text()).toBe('Operación')

  await view.get('button').trigger('click')
  await flushPromises()
  expect(fetchMock).toHaveBeenNthCalledWith(5, '/api/auth/csrf')
  expect(fetchMock).toHaveBeenNthCalledWith(6, '/api/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': 'after-login' },
  })
  expect(view.get('h1').text()).toBe('Iniciar sesión')
  expect(view.get<HTMLInputElement>('#password').element.value).toBe('')
  expect(view.text()).not.toContain('Operación')
})

it('restaura una sesión existente al abrir la aplicación', async () => {
  fetchMock.mockResolvedValueOnce(Response.json(account))
  const view = openApp()
  await flushPromises()
  expect(view.get('main').text()).toBe('Operación')
  expect(view.find('form').exists()).toBe(false)
})

it('muestra el error de credenciales y borra la contraseña', async () => {
  fetchMock.mockResolvedValueOnce(status(401)).mockResolvedValueOnce(csrf('token')).mockResolvedValueOnce(status(401))
  const view = openApp()
  await flushPromises()
  await fillCredentials(view)
  expect(view.get('[role="alert"]').text()).toBe('Usuario o contraseña incorrectos.')
  expect(view.get<HTMLInputElement>('#password').element.value).toBe('')
  expect(view.get<HTMLInputElement>('#username').element.value).toBe('operador')
  expect(view.text()).not.toContain('Operación')
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it('permite reintentar cuando falla la consulta de sesión', async () => {
  fetchMock.mockResolvedValueOnce(status(500)).mockResolvedValueOnce(status(401))
  const view = openApp()
  await flushPromises()
  expect(view.get('[role="alert"]').text()).toBe('No se pudo consultar la sesión.')
  expect(view.find('form').exists()).toBe(false)
  await view.get('button').trigger('click')
  await flushPromises()
  expect(view.get('h1').text()).toBe('Iniciar sesión')
  expect(view.find('[role="alert"]').exists()).toBe(false)
})

it('no envía credenciales cuando falla la solicitud de CSRF', async () => {
  fetchMock.mockResolvedValueOnce(status(401)).mockResolvedValueOnce(status(500))
  const view = openApp()
  await flushPromises()
  await fillCredentials(view)
  expect(view.get('[role="alert"]').text()).toBe('No se pudo preparar la solicitud. Intenta de nuevo.')
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it.each([
  [500, 'No se pudo iniciar sesión. Intenta de nuevo.'],
  [204, 'No se pudo confirmar el inicio de sesión.'],
])('mantiene el formulario cuando el login no se confirma (%s)', async (code, message) => {
  fetchMock
    .mockResolvedValueOnce(status(401))
    .mockResolvedValueOnce(csrf('token'))
    .mockResolvedValueOnce(status(code))
    .mockResolvedValueOnce(status(401))
  const view = openApp()
  await flushPromises()
  await fillCredentials(view)
  expect(view.get('[role="alert"]').text()).toBe(message)
  expect(view.text()).not.toContain('Operación')
})

it('conserva la sesión visible si el servidor rechaza el cierre', async () => {
  fetchMock.mockResolvedValueOnce(Response.json(account)).mockResolvedValueOnce(csrf('token')).mockResolvedValueOnce(status(403))
  const view = openApp()
  await flushPromises()
  await view.get('button').trigger('click')
  await flushPromises()
  expect(view.get('[role="alert"]').text()).toBe('No se pudo cerrar sesión. Intenta de nuevo.')
  expect(view.get('main').text()).toBe('Operación')
})
